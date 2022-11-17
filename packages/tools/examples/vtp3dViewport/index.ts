import {
  RenderingEngine,
  Types,
  Enums,
  setVolumesForViewports,
  volumeLoader,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';
import applyPreset from './applyPreset';
import presets from './presets';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPolyDataReader from '@kitware/vtk.js/IO/Legacy/PolyDataReader';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';

// import { vtiVolumeLoader } from '../../../core/examples/vtiVolumeLoader/vtiVolumeLoader';

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

// Define a unique id for the volume
const volumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
const volumeLoaderScheme = 'vtiVolumeLoader'; // Loader id which defines which volume loader to use
const volumeId = `${volumeLoaderScheme}:${volumeName}`; // VolumeId with loader id + volume id

// ======== Set up page ======== //
setTitleAndDescription(
  'Annotation Tools On Volumes',
  'Here we demonstrate how annotation tools can be drawn/rendered on any plane.'
);

const size = '500px';
const content = document.getElementById('content');
const viewportGrid1 = document.createElement('div');
const viewportGrid2 = document.createElement('div');

viewportGrid1.style.display = 'flex';
viewportGrid1.style.display = 'flex';
viewportGrid1.style.flexDirection = 'row';

viewportGrid2.style.display = 'flex';
viewportGrid2.style.display = 'flex';
viewportGrid2.style.flexDirection = 'row';

const element1 = document.createElement('div');
const element2 = document.createElement('div');
const element3 = document.createElement('div');
const element4 = document.createElement('div');
element1.oncontextmenu = () => false;
element2.oncontextmenu = () => false;
element3.oncontextmenu = () => false;
element4.oncontextmenu = () => false;

element1.style.width = size;
element1.style.height = size;
element2.style.width = size;
element2.style.height = size;
element3.style.width = size;
element3.style.height = size;
element4.style.width = size;
element4.style.height = size;

viewportGrid1.appendChild(element1);
viewportGrid1.appendChild(element2);
viewportGrid2.appendChild(element3);
viewportGrid2.appendChild(element4);

content.appendChild(viewportGrid1);
content.appendChild(viewportGrid2);

const instructions = document.createElement('p');
instructions.innerText =
  'Left Click to draw length measurements on any viewport.\n Use the mouse wheel to scroll through the stack.';

content.append(instructions);

async function getXML(url, viewport) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const vtpReader = vtkXMLPolyDataReader.newInstance();
  vtpReader.parseAsArrayBuffer(arrayBuffer);

  const lookupTable = vtkColorTransferFunction.newInstance();
  const source = vtpReader.getOutputData(0);
  const mapper = vtkMapper.newInstance({
    interpolateScalarsBeforeMapping: false,
    useLookupTableScalarRange: true,
    lookupTable,
    scalarVisibility: false,
  });
  const actor = vtkActor.newInstance();
  console.log(`Actor info:`);
  console.log(actor.getClassName());
  actor.setMapper(mapper);
  mapper.setInputData(source);
  viewport.setActors([{ uid: 'vtpActor', actor }]);
  viewport.render();
}
// ============================= //

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  const toolGroupId = 'STACK_TOOL_GROUP_ID';

  // Register volume loader

  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(LengthTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(TrackballRotateTool);
  cornerstoneTools.addTool(StackScrollMouseWheelTool);

  // Define a tool group, which defines how mouse events map to tool commands for
  // Any viewport using the group
  // Tool group for VTP loader
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

  // Tool group for other viewports
  const toolGroup2 = ToolGroupManager.createToolGroup('myToolGroup');
  toolGroup2.addTool(StackScrollMouseWheelTool.toolName);
  toolGroup2.setToolActive(StackScrollMouseWheelTool.toolName);

  // Get Cornerstone imageIds and fetch metadata into RAM
  const imageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
    wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
    type: 'VOLUME',
  });

  // Get Cornerstone imageIds and fetch metadata into RAM
  const url = 'https://rapid-event-demo.s3.amazonaws.com/vessels.vtp';

  // Instantiate a rendering engine
  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create the viewports
  const viewportIds = [
    'CT_AXIAL_STACK',
    'CT_SAGITTAL_STACK',
    'CT_OBLIQUE_STACK',
    'VTP_3D',
  ];

  const viewportInputArray = [
    {
      viewportId: viewportIds[0],
      type: ViewportType.ORTHOGRAPHIC,
      element: element1,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: <Types.Point3>[0, 0, 0],
      },
    },
    {
      viewportId: viewportIds[1],
      type: ViewportType.ORTHOGRAPHIC,
      element: element2,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
        background: <Types.Point3>[0, 0, 0],
      },
    },
    {
      viewportId: viewportIds[2],
      type: ViewportType.ORTHOGRAPHIC,
      element: element3,
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
        background: <Types.Point3>[0, 0, 0],
      },
    },
    {
      viewportId: viewportIds[3],
      type: ViewportType.ORTHOGRAPHIC,
      element: element4,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: <Types.Point3>[0, 0, 0],
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  // Define a volume in memory
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });

  // Set the volume to load
  volume.load();

  setVolumesForViewports(
    renderingEngine,
    [{ volumeId }],
    viewportIds.slice(0, 3)
  );

  // Set the tool group on the viewports
  for (let i = 0; i < 3; i++) {
    toolGroup2.addViewport(viewportIds[i], 'myRenderingEngine');
  }

  toolGroup.addViewport(viewportIds[3], 'myRenderingEngine');

  // viewportIds.forEach((viewportId) =>
  //   toolGroup.addViewport(viewportId, 'myRenderingEngine')
  // );

  // Render the image
  renderingEngine.renderViewports(viewportIds);

  console.log(renderingEngine);

  const viewport = <Types.IVolumeViewport>(
    renderingEngine.getViewport(viewportIds[3])
  );

  console.log(`Viewport`);
  console.log(viewport);

  getXML(url, viewport);
}

run();
