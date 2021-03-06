import React from 'react'
import classnames from 'classnames'
import withStyles from 'isomorphic-style-loader/lib/withStyles'

import MdArrowBack from 'react-icons/lib/md/arrow-back'
import MdMic from 'react-icons/lib/md/mic'
import MdCheck from 'react-icons/lib/md/check'
import MdPlayArrow from 'react-icons/lib/md/play-arrow'
import MdStop from 'react-icons/lib/md/stop'
import MdAdd from 'react-icons/lib/md/add'
import MdRefresh from 'react-icons/lib/md/refresh'
import MdEdit from 'react-icons/lib/md/edit'
import MdVolumeUp from 'react-icons/lib/md/volume-up'
import MdEqualizer from 'react-icons/lib/md/equalizer'

import styles from './styles.css'

function renderBackButton () {
  return (<MdArrowBack className={styles.button} color={styles.white} />)
}

function renderRecordButton () {
  return (<MdMic className={styles.button} color={styles.white} />)
}

function renderCheckButton () {
  return (<MdCheck className={styles.button} color={styles.white} />)
}

function renderPlayButton () {
  return (<MdPlayArrow className={styles.button} color={styles.white} />)
}

function renderStopButton () {
  return (<MdStop className={styles.button} color={styles.white} />)
}

function renderAddButton () {
  return (<MdAdd className={styles.button} color={styles.white} />)
}

function renderRefreshButton () {
  return (<MdRefresh className={styles.button} color={styles.white} />)
}

function renderLoadingButton ({ colorOveride }) {
  return (<div className={classnames(styles.loadSpinner, { [colorOveride]: colorOveride }, styles.button)} />)
}

function renderEditButton () {
  return (<MdEdit className={styles.button} color={styles.white} />)
}

function renderVolumeButton () {
  return (<MdVolumeUp className={styles.button} color={styles.white} />)
}

function renderMenuButton () {
  return (<MdEqualizer className={styles.button} color={styles.white} />)
}

class Button extends React.Component {
  render () {
    const { position, type, cb, color } = this.props

    const buttonMapping = buttonMappings[type]
    const positionClass = positionMappings[position]

    const colorClass = color
      ? styles[`${color}Button`]
      : buttonMapping.styles

    return (
      <div key={position} className={classnames(styles.buttonContainer, styles[positionClass], colorClass)} onClick={cb}>
        <buttonMapping.Icon colorOveride={color} />
      </div>
    )
  }
}

const buttonMappings = {
  ADD: {
    Icon: renderAddButton,
    styles: styles.greenButton
  },
  BACK: {
    Icon: renderBackButton,
    styles: styles.redButton
  },
  CHECK: {
    Icon: renderCheckButton,
    styles: styles.greenButton
  },
  PLAY: {
    Icon: renderPlayButton,
    styles: styles.redButton
  },
  RECORD: {
    Icon: renderRecordButton,
    styles: styles.greenButton
  },
  REFRESH: {
    Icon: renderRefreshButton,
    styles: styles.blueButton
  },
  STOP: {
    Icon: renderStopButton,
    styles: styles.redButton
  },
  LOADING: {
    Icon: renderLoadingButton,
    styles: styles.redButton
  },
  EDIT: {
    Icon: renderEditButton,
    styles: styles.greenButton
  },
  VOLUME: {
    Icon: renderVolumeButton,
    styles: styles.blueButton
  },
  MENU: {
    Icon: renderMenuButton,
    styles: styles.blueButton
  }
}

const positionMappings = {
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center',
  BOTTOM_RIGHT: 'bottom-right'
}

const NavButton = withStyles(styles)(Button)

export {
  NavButton
}
