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
 * @typedef {Object} AssertionStep
 * @property {"assertion"} action
 * @property {string} target
 * @property {string} contains
 */

/**
 * @typedef {OpenStep | TypeStep | ClickStep | AssertionStep} Step
 */
export {};
