import {
  RenderingEngine,
  Types,
  Enums,
  volumeLoader,
  getRenderingEngine,
  utilities,
  CONSTANTS,
  createVolumeActor,
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
import * as cornerstoneTools from '@cornerstonejs/tools';
// Import presets and preset helper
import applyPreset from './applyPreset';
import presets from './presets';
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
import { vtiVolumeLoader } from './csvtiVolumeLoader';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const {
  LengthTool,
  ToolGroupManager,
  TrackballRotateTool,
  StackScrollMouseWheelTool,
  ZoomTool,
  Enums: csToolsEnums,
} = cornerstoneTools;

const { ViewportType } = Enums;
const { MouseBindings } = csToolsEnums;

const viewportId = 'VOLUME_VIEWPORT';

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

// reader.setUrl('https://d1zt0lkqsoz8si.cloudfront.net/mip_image.vti');
/*
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
*/

// TODO ->

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(LengthTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(TrackballRotateTool);
  cornerstoneTools.addTool(StackScrollMouseWheelTool);

  // Define a tool group, which defines how mouse events map to tool commands for
  // Any viewport using the group
  const toolGroupId = 'STACK_TOOL_GROUP_ID';
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

  // Add the tools to the tool group and specify which volume they are pointing at
  toolGroup.addTool(LengthTool.toolName, { configuration: { volumeId } });
  toolGroup.addTool(TrackballRotateTool.toolName, {
    configuration: { volumeId },
  });
  toolGroup.addTool(ZoomTool.toolName, { configuration: { volumeId } });
  toolGroup.addTool(StackScrollMouseWheelTool.toolName);

  // Set the initial state of the tools, here we set one tool active on left click.
  // This means left click will draw that tool.
  toolGroup.setToolActive(TrackballRotateTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Primary, // Left Click
      },
    ],
  });

  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Secondary, // Right Click
      },
    ],
  });

  // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
  // hook instead of mouse buttons, it does not need to assign any mouse button.
  toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

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
  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create a stack viewport
  const viewportInput = {
    viewportId,
    type: ViewportType.ORTHOGRAPHIC,
    element,
    defaultOptions: {
      orientation: Enums.OrientationAxis.SAGITTAL,
      background: <Types.Point3>[0.2, 0, 0.2],
    },
  };

  renderingEngine.enableElement(viewportInput);

  // Set tool group for viewport
  toolGroup.addViewport(viewportId, renderingEngineId);

  // Get the viewport that was created
  const viewport = <Types.IVolumeViewport>(
    renderingEngine.getViewport(viewportId)
  );

  // Define a volume in memory
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });
  console.log(`Volume: ${volume}`);
  const actor = await createVolumeActor({ volumeId }, element, viewportId);
  console.log(`Actor class name: ${actor.getClassName()}`);

  // Set the volume to load
  //volume.load();

  viewport.addActor(actor);

  // Set the volume on the viewport
  // const volumeActor = renderingEngine
  //   .getViewport(viewportId)
  //   .getDefaultActor().actor;

  // applyPreset(
  //   volumeActor,
  //   presets.find((preset) => preset.name === 'CT-AAA')
  // );

  const rgbTransferFunction = volume.getProperties;
  console.log(rgbTransferFunction);

  console.log(viewport.getSlabThickness());
  // viewport.setSlabThickness(100);

  // Render the image
  viewport.render();
}

run();
