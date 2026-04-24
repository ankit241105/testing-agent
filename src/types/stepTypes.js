/**
 * @typedef {Object} OpenStep
 * @property {"open"} action
 * @property {string} url
 */

/**
 * @typedef {Object} TypeStep
 * @property {"type"} action
 * @property {string} target
 * @property {string} value
 */

/**
 * @typedef {Object} ClickStep
 * @property {"click"} action
 * @property {string} target
 */

/**
 * @typedef {Object} AssertionContainsStep
 * @property {"assertion"} action
 * @property {string} target
 * @property {string} contains
 */

/**
 * @typedef {Object} AssertionContainsAnyStep
 * @property {"assertion"} action
 * @property {string} target
 * @property {string[]} contains_any
 */

/**
 * @typedef {OpenStep | TypeStep | ClickStep | AssertionContainsStep | AssertionContainsAnyStep} Step
 */
export {};
