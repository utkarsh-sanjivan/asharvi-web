export default {
  // Disable pnpm-style pruning of node_modules
  bundle: {
    externals: [],
    include: ["@swc/helpers/**"],
  },
  server: {
    // Forces OpenNext to include node_modules fully
    nodeModules: ["*"]
  }
};
