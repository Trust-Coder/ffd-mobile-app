/** App-wide DOM events. */

/** Dispatched by PushManager when a push arrives in the foreground. */
export const PUSH_RECEIVED_EVENT = 'ffd:push-received'

/** Dispatched on app resume and pull-to-refresh; the data hooks reload on it. */
export const APP_REFRESH_EVENT = 'ffd:refresh'
