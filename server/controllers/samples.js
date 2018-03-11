import randomWords from 'random-words'

import { Players, Traks } from '../models'

import { ANONYMOUS_PLAYER_ID } from '../models/Players'

import { sequelize } from '../adapters/db'
import { saveBlobToS3 } from '../adapters/s3'

async function createSampleTrakSampleInstance (queryStrings = {}, s3ResourceName) {
  const duration = queryStrings.duration || 0.0
  const start_time = queryStrings.startTime || 0.0 // eslint-disable-line 
  const volume = queryStrings.volume || -6.0
  const panning = queryStrings.panning || 0.0

  return sequelize.transaction(async transaction => {
    const player = await Players.findById(ANONYMOUS_PLAYER_ID)
    const sample = await player.createSample(
      {
        url: s3ResourceName,
        duration
      },
      { transaction }
    )

    let trakName = queryStrings.trakName

    /**
     * trak doesn't exist: Create a new trak
     */
    if (!trakName) {
      trakName = randomWords({ exactly: 3, join: '-' })

      // @todo ensure that trakName is not already in use!!!

      const trak = await player.createTrak({
        name: trakName,
        start_time: 0,
        duration
      }, { transaction })

      await sample.createSample_instance({
        start_time,
        volume,
        panning,
        player_id: ANONYMOUS_PLAYER_ID,
        trak_id: trak.id
      }, { transaction })

      return trakName
    /**
     * trak exists: Do we need to update start_time AND/OR duration?
     */
    } else {
      const trak = await Traks.findOne({
        where: { name: trakName },
        transaction,
        lock: transaction.LOCK.UPDATE
      })

      let updates = {
        contribution_count: trak.contribution_count + 1,
        last_contribution_date: sequelize.fn('NOW')
      }

      const currentDuration = Number.parseFloat(trak.duration)
      const sampleStartTime = Number.parseFloat(start_time)
      const sampleDuration = Number.parseFloat(duration)

      /**
       * update trak.start_time ??
       */
      if (sampleStartTime < trak.start_time) {
        updates = Object.assign({}, updates, {
          start_time: sampleStartTime,
          duration: currentDuration + (trak.start_time - sampleStartTime)
        })
      }

      /**
       * update trak.duration ??
       */
      if ((sampleStartTime + sampleDuration) > trak.start_time + currentDuration) {
        const currentDurationUpdate = updates.duration || currentDuration
        const endPointDiff = (sampleStartTime + sampleDuration) - (trak.start_time + currentDuration)
        const newDuration = currentDurationUpdate + endPointDiff
        updates = Object.assign({}, updates, { duration: newDuration })
      }

      await trak.update(updates, { transaction })
      await sample.createSample_instance({
        start_time,
        volume,
        panning,
        player_id: ANONYMOUS_PLAYER_ID,
        trak_id: trak.id
      }, { transaction })

      return trakName
    }
  })
}

async function create (req, res, next) {
  try {
    const s3ResourceName = await saveBlobToS3(req)

    const trakName = await createSampleTrakSampleInstance(req.query, s3ResourceName)

    res.json({ trakName })
  } catch (error) {
    next(error)
  }
}

export {
  create
}
