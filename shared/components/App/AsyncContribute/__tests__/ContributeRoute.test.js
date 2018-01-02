/* eslint-env jest */

import React from 'react'
import { shallow } from 'enzyme'

import { ContributeRoute } from '../ContributeRoute'

describe('<ContributeRoute />', () => {
  test('renders', () => {
    const wrapper = shallow(<ContributeRoute />)
    expect(wrapper).toMatchSnapshot()
  })
})
