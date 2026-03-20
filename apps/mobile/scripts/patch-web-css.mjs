import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distCssDir = path.join(projectRoot, 'dist-web', '_expo', 'static', 'css');
const generatedCssCandidates = [
  path.join(projectRoot, 'node_modules', 'react-native-css-interop', '.cache', 'web.css'),
  path.join(projectRoot, '..', '..', 'node_modules', 'react-native-css-interop', '.cache', 'web.css'),
];
const generatedCssPath = generatedCssCandidates.find((candidate) => fs.existsSync(candidate));

if (!generatedCssPath) {
  throw new Error(
    `NativeWind cache CSS not found. Checked: ${generatedCssCandidates.join(', ')}`
  );
}

if (!fs.existsSync(distCssDir)) {
  throw new Error(`Exported CSS directory not found: ${distCssDir}`);
}

const exportedCssFiles = fs
  .readdirSync(distCssDir)
  .filter((file) => /^web-.*\.css$/.test(file));

if (exportedCssFiles.length !== 1) {
  throw new Error(
    `Expected exactly one exported web CSS file, found ${exportedCssFiles.length}`
  );
}

const exportedCssPath = path.join(distCssDir, exportedCssFiles[0]);
fs.copyFileSync(generatedCssPath, exportedCssPath);

console.log(`Patched exported CSS: ${exportedCssPath}`);
