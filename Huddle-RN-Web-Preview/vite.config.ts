import {defineConfig} from 'vite';
export default defineConfig({
  resolve: {
    alias: [{find: /^react-native$/, replacement: 'react-native-web'}],
    extensions: ['.web.tsx','.tsx','.web.ts','.ts','.jsx','.js','.json']
  },
  define: {'process.env.EXPO_OS': JSON.stringify('web'), 'process.env.NODE_ENV': JSON.stringify('development')},
  server: {port:5173, proxy: {'/ai': 'http://127.0.0.1:8787', '/api/food': 'http://127.0.0.1:8788'}},
  preview: {proxy: {'/ai': 'http://127.0.0.1:8787', '/api/food': 'http://127.0.0.1:8788'}}
});
