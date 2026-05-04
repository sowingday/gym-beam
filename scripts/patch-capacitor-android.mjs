import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const buildGradlePath = path.join(
  projectRoot,
  'android',
  'capacitor-cordova-android-plugins',
  'build.gradle',
);

const originalFlatDirBlock = `repositories {
    google()
    mavenCentral()
    flatDir{
        dirs 'src/main/libs', 'libs'
    }
}
`;

const patchedFlatDirBlock = `repositories {
    google()
    mavenCentral()
    if (!flatDirRepos.isEmpty()) {
        flatDir {
            dirs flatDirRepos
        }
    }
}
`;

const originalDependenciesBlock = `dependencies {
    implementation fileTree(dir: 'src/main/libs', include: ['*.jar'])
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "org.apache.cordova:framework:$cordovaAndroidVersion"
`;

const patchedDependenciesBlock = `dependencies {
    if (file('src/main/libs').exists()) {
        implementation fileTree(dir: 'src/main/libs', include: ['*.jar'])
    }
    if (file('libs').exists()) {
        implementation fileTree(dir: 'libs', include: ['*.jar'])
    }
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "org.apache.cordova:framework:$cordovaAndroidVersion"
`;

const helperBlock = `def localArtifactExtensions = ['.jar', '.aar']
def localLibDirs = ['src/main/libs', 'libs']
def flatDirRepos = localLibDirs.findAll { dir ->
    def resolvedDir = file(dir)
    resolvedDir.exists() && resolvedDir.isDirectory() && resolvedDir.listFiles()?.any { file ->
        localArtifactExtensions.any { extension -> file.name.toLowerCase().endsWith(extension) }
    }
}

`;

async function main() {
  const original = await readFile(buildGradlePath, 'utf8');
  let updated = original;

  if (!updated.includes('def flatDirRepos = localLibDirs.findAll')) {
    updated = updated.replace('buildscript {\n', `${helperBlock}buildscript {\n`);
  }

  updated = updated.replace(originalFlatDirBlock, patchedFlatDirBlock);
  updated = updated.replace(originalDependenciesBlock, patchedDependenciesBlock);

  if (updated !== original) {
    await writeFile(buildGradlePath, updated, 'utf8');
    console.log(`Patched ${buildGradlePath}`);
    return;
  }

  console.log(`No patch needed for ${buildGradlePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
