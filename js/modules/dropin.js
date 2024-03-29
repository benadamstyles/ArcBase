// @flow

import _ from 'lodash'
import {trans} from './util'
import Lazy from 'lazy.js'

type Question = {
  key: string,
  placeholder: string,
  type: string,
  value: string,
  attributes: Object
}

function buildInput(q) {
  let input

  if (q.type === 'textarea') {
    input = document.createElement('textarea')
    input.rows = 5
  } else {
    input = document.createElement('input')
    input.type = q.type
  }

  input.placeholder = q.placeholder

  if (q.attributes) {
    const inputCastObj: Object = input
    _.each(q.attributes, (v, k) => inputCastObj[k] = v)
  }

  if (q.value) input.value = q.value

  return input
}

/**
   * Drop-in modal with questions
   * @param  {String} text           Header text
   * @param  {Array} questionsArray  Array of objects with `key`,`placeholder`,`type`
   *                                 and optional `value` to pre-fill
   * @return {Promise}               Resolves with key/val object
   */
export default function dropin(text: string, questionsArray: Array<Question>) {
  return new Promise((resolve, reject) => {
    const frag = document.createDocumentFragment(),
          overlay = document.createElement('div'),
          form = document.createElement('form'),
          content = document.createElement('div'),
          p = document.createElement('h3'),
          submit = document.createElement('button');

    const inputs = questionsArray.map(buildInput)

    p.innerHTML = text

    form.id = "dropin"
    form.appendChild(content)

    content.appendChild(p)

    inputs.forEach(function(q) {
      if (q.type === 'date') {
        const label = document.createElement('p')
        label.textContent = q.placeholder
        content.appendChild(label)
      }
      content.appendChild(q)
    })
    submit.textContent = 'Submit'
    form.appendChild(submit)

    overlay.id = "dropin-overlay"
    overlay.appendChild(form)
    frag.appendChild(overlay)
    document.body.appendChild(frag)

    _.defer(() => overlay.className = "overlay-show")

    overlay.addEventListener('click', async event => {
      if (event.target === event.currentTarget) {
        await trans(overlay, 'remove', 'overlay-show')
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
        reject()
      }
    })

    submit.addEventListener('click', event => {
      event.preventDefault()

      const requiredFields = _.map(questionsArray, 'required')

      async function complete() {
        await trans(overlay, 'remove', 'overlay-show')
        resolve(
          Lazy(inputs)
          .pluck('value')
          .map((value, i) => [value, i])
          .indexBy(
            ([value, i]) => questionsArray[i].key, // eslint-disable-line no-unused-vars
            ([value]) => value
          )
          .toObject()
        )
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
      }

      if (_.some(requiredFields, _.identity)) { // required fields exist
        if (
          inputs.map((input, i) => {
            if (requiredFields[i]) {
              if (input.value) {
                inputs[i].classList.remove('invalid')
                return true
              } else {
                inputs[i].classList.add('invalid')
                return false
              }
            } else {
              return true
            }
          }).every(_.identity)
        ) complete()
      } else {
        complete() // no required fields
      }
    })
  })
}
