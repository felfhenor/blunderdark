export const environment = {
  production: true,
  platform: 'web',
  gameanalytics: {
    game: '95d44ded96a06a633bdd100a2d6e57f8',
    secret: '7f9efe9026a17dd157b6e81d4faf7ba82022df1e',
  },
  rollbar: {
    accessToken:
      '34d63140c2824f34ae7857d7a18a61ed5c39f3e7ea9512325ad600a9f02af03268897a1a9c9cff82785a9a182eff4485',
    hostBlockList: ['netlify.app'],
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      environment: 'production',
      client: {
        javascript: {
          code_version: '1.0',
          source_map_enabled: true,
          guess_uncaught_frames: true,
        },
      },
    },
    recorder: {
      enabled: true,
    },
  },
};
