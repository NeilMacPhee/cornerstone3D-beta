/**
 * WARNING
 * DO NOT REMOVE ANY OF THE BELOW IMPORT STATEMENTS
 * SOME ARE USED FOR SOME OF THE TUTORIALS, AND WILL BREAK IF REMOVED
 */

import {
  RenderingEngine,
  Types,
  Enums,
  setVolumesForViewports,
  volumeLoader,
} from '@cornerstonejs/core';
import {
  addTool,
  BrushTool,
  SegmentationDisplayTool,
  BidirectionalTool,
  ToolGroupManager,
  WindowLevelTool,
  ZoomTool,
  segmentation,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
} from '../../../../utils/demo/helpers';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

// ============================= //
// ======== Set up page ======== //
setTitleAndDescription(
  'Tutorial Playground',
  'The playground for you to copy paste the codes in the tutorials and run it'
);

const { ViewportType } = Enums;
/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  /**
   *
   *
   *
   *
   *
   *
   *
   *
   * Copy-paste the code from tutorials below to try them locally.
   * You can run the tutorial after by running `yarn run example tutorial` when
   * you are at the root of the tools package directory.
   *
   *
   *
   *
   *
   *
   *
   */
  const content = document.getElementById('content');

  const viewportGrid = document.createElement('div');
  viewportGrid.style.display = 'flex';
  viewportGrid.style.flexDirection = 'row';

  // element for axial view
  const element1 = document.createElement('div');
  element1.style.width = '500px';
  element1.style.height = '500px';

  // element for sagittal view
  const element2 = document.createElement('div');
  element2.style.width = '500px';
  element2.style.height = '500px';

  viewportGrid.appendChild(element1);
  viewportGrid.appendChild(element2);

  content.appendChild(viewportGrid);

  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // note we need to add the cornerstoneStreamingImageVolume: to
  // use the streaming volume loader
  const volumeId = 'cornerStreamingImageVolume: myVolume';

  // Define a volume in memory
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });

  const viewportId1 = 'CT_AXIAL';
  const viewportId2 = 'CT_SAGITTAL';

  const viewportInput = [
    {
      viewportId: viewportId1,
      element: element1,
      type: ViewportType.ORTHOGRAPHIC,
      defaultOptions: {
        orientation: ORIENTATION.AXIAL,
      },
    },
    {
      viewportId: viewportId2,
      element: element2,
      type: ViewportType.ORTHOGRAPHIC,
      defaultOptions: {
        orientation: ORIENTATION.SAGITTAL,
      },
    },
  ];

  renderingEngine.setViewports(viewportInput);

  // Set the volume to load
  volume.load();

  setVolumesForViewports(
    renderingEngine,
    [{ volumeId }],
    [viewportId1, viewportId2]
  );

  // Render the image
  renderingEngine.renderViewports([viewportId1, viewportId2]);
}

run();
