module.exports = {
  // Lets the dev server respond when reached through a tunnel hostname (e.g. a
  // localtunnel/ngrok URL used to test the barcode scanner's camera access from a
  // phone, since getUserMedia requires HTTPS or localhost) instead of rejecting it
  // with "Invalid Host header". Fine for local dev; not shipped to production.
  devServer: {
    allowedHosts: 'all',
  },
  webpack: {
    configure: (webpackConfig) => {
      // @zxing/browser (barcode scanner) ships sourcemaps that point at .ts files
      // not included in the published npm package, so source-map-loader can never
      // find them — harmless, but it logs one warning per file. Silence just that.
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        /Failed to parse source map/,
      ];
      return webpackConfig;
    },
  },
};
