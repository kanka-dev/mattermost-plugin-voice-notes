const config = {
    presets: [
        ['@babel/preset-env', {
            targets: {
                chrome: 80,
                firefox: 75,
                edge: 80,
            },
            modules: false,
            corejs: 3,
            useBuiltIns: 'usage',
            shippedProposals: true,
        }],
        ['@babel/preset-react', {
            useBuiltIns: true,
        }],
        ['@babel/preset-typescript', {
            allExtensions: true,
            isTSX: true,
        }],
    ],
    plugins: [],
};

// Jest needs module transformation
config.env = {
    test: {
        presets: config.presets,
        plugins: config.plugins,
    },
};
config.env.test.presets[0][1].modules = 'auto';

module.exports = config;
