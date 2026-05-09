import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const buildGradlePath = path.join(
  projectRoot,
  'android',
  'capacitor-cordova-android-plugins',
  'build.gradle',
);
const capacitorAppBuildGradlePath = path.join(
  projectRoot,
  'node_modules',
  '@capacitor',
  'app',
  'android',
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

const legacyProguardLine = `            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'`;
const supportedProguardLine = `            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'`;

async function patchFile(filePath, transform) {
  const original = await readFile(filePath, 'utf8');
  const updated = transform(original);

  if (updated !== original) {
    await writeFile(filePath, updated, 'utf8');
    console.log(`Patched ${filePath}`);
    return true;
  }

  console.log(`No patch needed for ${filePath}`);
  return false;
}

async function main() {
  await patchFile(buildGradlePath, (original) => {
    let updated = original;

    if (!updated.includes('def flatDirRepos = localLibDirs.findAll')) {
      updated = updated.replace('buildscript {\n', `${helperBlock}buildscript {\n`);
    }

    updated = updated.replace(originalFlatDirBlock, patchedFlatDirBlock);
    updated = updated.replace(originalDependenciesBlock, patchedDependenciesBlock);
    return updated;
  });

  await patchFile(capacitorAppBuildGradlePath, (original) =>
    original.replace(legacyProguardLine, supportedProguardLine));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
