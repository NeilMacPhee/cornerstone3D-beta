import {
  RenderingEngine,
  Types,
  Enums,
  volumeLoader,
  getRenderingEngine,
  utilities,
  CONSTANTS,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  addButtonToToolbar,
  addDropdownToToolbar,
  addSliderToToolbar,
  camera as cameraHelpers,
  setCtTransferFunctionForVolumeActor,
} from '../../../../utils/demo/helpers';
// VTK loaders
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import HttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';
import { vtiVolumeLoader } from './vtiVolumeLoader';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const { ViewportType } = Enums;
const { ORIENTATION } = CONSTANTS;

const renderingEngineId = 'myRenderingEngine';
const viewportId = 'CT_SAGITTAL_STACK';

// Define a unique id for the volume
const volumeName = 'NEW'; // Id of the volume less loader prefix
const volumeLoaderScheme = 'vtiVolumeLoader'; // Loader id which defines which volume loader to use
const volumeId = `${volumeLoaderScheme}:${volumeName}`; // VolumeId with loader id + volume id

// ======== Set up page ======== //
setTitleAndDescription(
  'Volume Viewport API',
  'Demonstrates how to interact with a Volume viewport.'
);

const content = document.getElementById('content');
const element = document.createElement('div');
element.id = 'cornerstone-element';
element.style.width = '500px';
element.style.height = '500px';

content.appendChild(element);

// ========================================================== //

const reader = vtkHttpDataSetReader.newInstance({
  fetchGzip: true,
});

reader.setUrl('https://d1zt0lkqsoz8si.cloudfront.net/mip_image.vti');

reader
  .setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti', {
    loadData: true,
  })
  .then(() => {
    const data = reader.getOutputData();
    console.log(`<==================Vti Data==================>`);
    console.log(data);
    console.log(`Dimensions:`);
    console.log(data.getDimensions());
    console.log(`Directions:`);
    console.log(data.getDirection());
    console.log(`Metadata`);
    console.log(`Origin:`);
    console.log(data.getOrigin());
    console.log(`Scalar data:`);
    console.log(data.getPointData().getScalars().getData());
    console.log(`Volume scaling metadata`);
    console.log(`Spacing`);
    console.log(data.getSpacing());
    console.log(`Number of voxels:(?)`);
    console.log(`vtk Image Data:`);
    console.log(data.getClassName());
    console.log(`vtkOpenGlTexture:(?)`);
    console.log(data.getPointData().getScalars().getRange());
    console.log(`imageId:`);
    console.log(`imageIdIndex:`);
    console.log(data.getIndexToWorld());
    console.log(data.toJSON());
  });

// const reader = vtkHttpDataSetReader.newInstance();
// const vtiReader = vtkXMLImageDataReader.newInstance();
// vtiReader.parseAsArrayBuffer('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti');

// const readerTest = vtiReader.setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti');

// const fileReader = new FileReader();
// fileReader.readAsText('examples/VTIViewport3D/public/mip_image.vti');
// console.log(fileReader.result);

// vtiReader.SetFileName('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti')
// vtiReader.Update()
// const output = reader.GetOutput()

const test = HttpDataAccessHelper.fetchBinary(
  'https://kitware.github.io/vtk-js/data/volume/LIDC2.vti'
).then((binary) => {
  // const parsedArray = vtiReader.parseAsArrayBuffer(binary);
  console.log(binary);
});
console.log(test);

// const testText = HttpDataAccessHelper.fetchText(
//   'https://kitware.github.io/vtk-js/data/volume/LIDC2.vti'
// ).then((text) => {
//   // const parsedArray = vtiReader.parseAsArrayBuffer(binary);
//   console.log(text);
// });

// const vtiReaderOutput = reader
//   .setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti')
//   .then(() => reader.loadData())
//   .then(() => {
//     console.log("test");
//     //reader.loadData();
//     const data = reader.getOutputData().getPointData().getScalars().getRange();
//     console.log(data);
//   });
// console.log(vtiReaderOutput);

// const enc = new TextEncoder();
// const arrayBuffer = enc.encode('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti');
// console.log(arrayBuffer);

// vtiReader.parseAsArrayBuffer(arrayBuffer);

// const reader = vtkXMLImageDataReader.newInstance();

// vtiReader.parseAsArrayBuffer(arrayBuffer);
// const imageData = reader.getOutputData();

// const vtiReader = vtkXMLImageDataReader.newInstance();
//   vtiReader.parseAsArrayBuffer(fileContents);

// TODO ->

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Register "vtiVolumeLoader" with volumeLoader
  volumeLoader.registerVolumeLoader('vtiVolumeLoader', vtiVolumeLoader);

  // Get Cornerstone imageIds and fetch metadata into RAM
  const imageIds = [
    'vtiVolumeLoader:https://kitware.github.io/vtk-js/data/volume/LIDC2.vti',
  ];
  // const imageIds = [
  //   'vtiVolumeLoader:https://d1zt0lkqsoz8si.cloudfront.net/mip_image.vti',
  // ];

  // Instantiate a rendering engine
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create a stack viewport
  const viewportInput = {
    viewportId,
    type: ViewportType.ORTHOGRAPHIC,
    element,
    defaultOptions: {
      orientation: ORIENTATION.SAGITTAL,
      background: <Types.Point3>[0.2, 0, 0.2],
    },
  };

  renderingEngine.enableElement(viewportInput);

  // Get the stack viewport that was created
  const viewport = <Types.IVolumeViewport>(
    renderingEngine.getViewport(viewportId)
  );

  // Define a volume in memory
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });

  // Set the volume to load
  //volume.load();

  // Set the volume on the viewport
  viewport.setVolumes([
    { volumeId, callback: setCtTransferFunctionForVolumeActor },
  ]);

  const rgbTransferFunction = volume.getProperties;
  console.log(rgbTransferFunction);

  console.log(viewport.getSlabThickness());
  viewport.setSlabThickness(100);

  // Render the image
  viewport.render();
}

run();
