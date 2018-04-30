import Tone from 'tone'
import isEqual from 'lodash.isequal'

import config from '../../config'
import { getTrakRenderer } from './TrakRenderer'

const trakRenderer = getTrakRenderer()
const baseUrl = config('s3SampleBucket')
const bufferCache = {}
let playlistRenderer
let player = null
let cachedStagedBuffer
let cachedStagedSample

function loadSample (instance, loadTaskCb) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/${instance.sample.url}`
    
    let downloadAttempts = 0

    function attemptToLoadBuffer() {
      downloadAttempts++

      // try to download this three times
      // bc sometimes after making a contribution the cloud takes a moment to enable the new asset
      if (downloadAttempts <= 3) {
        (new Tone.Buffer()).load(url)
          .then(buffer => {
            bufferCache[instance.sample.id] = buffer
            loadTaskCb()
            resolve()
          })
          .catch(error => {
            console.error(error)
            setTimeout(attemptToLoadBuffer.bind(this), 1000 * downloadAttempts)
          })
      }
      else {
        // @todo log error
        bufferCache[instance.sample.id] = undefined
        loadTaskCb()
        reject()
      }
    }

    attemptToLoadBuffer()
  })
}

function syncPlayerToTransport (samplePlayer, playerStartTime, transport = Tone.Transport) {
  transport.schedule(() => {
    samplePlayer.start()
  }, playerStartTime)
}

function addPluginsToPlayer (samplePlayer, volume, panning) {
  // Plugins
  //
  const panVol = new Tone.PanVol(panning, volume)
  // const limiter = new Tone.Limiter(-6)

  samplePlayer.chain(panVol, /* limiter, */ Tone.Master)
}

function addBufferToTrak (buffer, instance, trakStartTime, transport) {
  let i = 0
  do {
    const samplePlayer = new Tone.Player(buffer)
    const playerStartTime = (instance.startTime + (i * instance.loopPadding)) - trakStartTime

    addPluginsToPlayer(samplePlayer, instance.volume, instance.panning)
    syncPlayerToTransport(samplePlayer, playerStartTime, transport)
    i++
  } while (i <= (instance.loopCount || 0))
}

function didInstancesCacheMiss (instances) {
  const cachedIds = Object.keys(bufferCache)
  return instances.some(instance => !cachedIds.includes(instance.sample.id))
}

function isBufferCached (buffer) {
  // if buffer doesn't exist, report cached (we don't want to bust cache if buffer doesn't exist bc some views don't use buffer)
  if (!buffer && !cachedStagedBuffer) {
    return true
  }

  return buffer === cachedStagedBuffer
}

function hasStagedSampleChanged (stagedSample) {
  if (!stagedSample) {
    return false
  }

  if (!cachedStagedSample) {
    cachedStagedSample = stagedSample
    return true
  }

  return !isEqual(cachedStagedSample, stagedSample)
}

function areBuffersCacheMiss (instances, buffer, stagedSample) {
  const isBufferCacheMiss = !isBufferCached(buffer)

  return didInstancesCacheMiss(instances) || isBufferCacheMiss || hasStagedSampleChanged(stagedSample)
}

/**
 * PUBLIC
 */

class PlaylistRenderer {
  getPlayer ({ trackDimensions, instances, buffer, stagedSample, loadTaskCb }) {
    const {
      startTime: trackStartTime,
      length: trackLength
    } = trackDimensions

    const trakAndOrBufferExist = (trackLength && instances && instances.length) || buffer

    if (trakAndOrBufferExist && areBuffersCacheMiss(instances, buffer, stagedSample)) {
      // Load the samples
      return Promise.all(instances.map(instance => loadSample(instance, loadTaskCb)))
        .then(() => {
          // render audio
          return Tone.Offline(OfflineTransport => {
            OfflineTransport.position = trackStartTime >= 0
              ? trackStartTime
              : 0

            // if buffer exists, add the staged sample to the track
            if (buffer) {
              cachedStagedBuffer = buffer
              addBufferToTrak(buffer, stagedSample, trackStartTime, OfflineTransport)
            }

            instances.forEach(instance => {
              addBufferToTrak(bufferCache[instance.sample.id], {
                ...instance,
                loopCount: instance.loop_count,
                loopPadding: instance.loop_padding,
                startTime: instance.start_time
              },
              trackStartTime,
              OfflineTransport)
            })

            OfflineTransport.start()
          }, trackLength || buffer.get().duration)
        })
        .then(buffer => {
          loadTaskCb()

          // this buffer will be saved to s3 on /staging save action
          trakRenderer.setBuffer(buffer.get())

          player = new Tone.Player(buffer).toMaster()
          return player
        })
    }

    return Promise.resolve(player)
  }
}

export function getPlaylistRenderer () {
  if (!playlistRenderer) {
    playlistRenderer = new PlaylistRenderer()
  }

  return playlistRenderer
}