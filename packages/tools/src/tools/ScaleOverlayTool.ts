import AnnotationDisplayTool from './base/AnnotationDisplayTool';
import { Events } from '../enums';
import {
  metaData,
  getEnabledElement,
  StackViewport,
  VolumeViewport,
  utilities,
  getEnabledElementByIds,
  getRenderingEngines,
  RenderingEngine,
} from '@cornerstonejs/core';
import { ReferenceLineAnnotation } from '../types/ToolSpecificAnnotationTypes';
import type { Types } from '@cornerstonejs/core';
import { filterViewportsWithToolEnabled } from '../utilities/viewportFilters';
import { drawLine as drawLineSvg } from '../drawingSvg';
import {
  EventTypes,
  PublicToolProps,
  ToolProps,
  SVGDrawingHelper,
  Annotation,
  Annotations,
} from '../types';
import { getViewportIdsWithToolToRender } from '../utilities/viewportFilters';
import triggerAnnotationRenderForViewportIds from '../utilities/triggerAnnotationRenderForViewportIds';
import { state } from '../store';
import { Enums } from '@cornerstonejs/core';
import { getToolGroup } from '../store/ToolGroupManager';
import { IPoints } from '../types';
import { element } from 'prop-types';

const SCALEOVERLAYTOOL_ID = 'scaleoverlay-viewport';

/**
 * @public
 * @class ScaleOverlayTool
 * @memberof Tools
 *
 * @classdesc Tool for displaying a scale overlay on the image.
 * @extends Tools.Base.BaseTool
 */
class ScaleOverlayTool extends AnnotationDisplayTool {
  static toolName;

  public touchDragCallback: any;
  public mouseDragCallback: any;
  _throttledCalculateCachedStats: any;
  editData: {
    renderingEngine: any;
    sourceViewport: any;
    annotation: ReferenceLineAnnotation;
  } | null = {} as any;
  isDrawing: boolean;
  isHandleOutsideImage: boolean;

  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        sourceViewportId: '',
        minorTickLength: 12.5,
        majorTickLength: 25,
      },
    }
  ) {
    super(toolProps, defaultToolProps);
  }
  //DONE: ---------
  check = true;

  if(check) {
    console.log('THIS RAN YOU CAN KEEP WORKINGT');
  }

  _init = (): void => {
    const renderingEngines = getRenderingEngines;
    const renderingEngine = renderingEngines[0];

    if (!renderingEngine) {
      return;
    }

    let viewports = renderingEngine.getViewports();
    viewports = filterViewportsWithToolEnabled(viewports, this.getToolName());

    const sourceViewport = renderingEngine.getViewport(
      this.configuration.sourceViewportId
    ) as Types.IVolumeViewport;

    if (!sourceViewport) {
      return;
    }

    // const { element } = sourceViewport;
    // const { viewUp, viewPlaneNormal } = source.Viewport.getCamera();
  };

  /**
   * Used to draw the scale annotation in each request animation
   * frame.
   *
   * @param enabledElement - The Cornerstone's enabledElement.
   * @param svgDrawingHelper - The svgDrawingHelper providing the context for drawing.
   * @returns
   */

  renderAnnotation(
    enabledElement: Types.IEnabledElement,
    svgDrawingHelper: SVGDrawingHelper
  ) {
    const { viewport } = enabledElement;
    const { annotation, sourceViewport } = this.editData;
    const { element } = viewport;
    const image = viewport.getImageData();
    const imageId = viewport.getCurrentImageId();
    const canvas = enabledElement.viewport.canvas;

    const renderStatus = false;

    if (!viewport) {
      return renderStatus;
    }

    const styleSpecifier: StyleSpecifier = {
      toolGroupId: this.toolGroupId,
      toolName: this.getToolName(),
      viewportId: enabledElement.viewport.id,
    };

    let rowPixelSpacing = image.spacing[0];
    let colPixelSpacing = image.spacing[1];
    const imagePlane = metaData.get('imagePlaneModule', imageId);
    console.log(imagePlane);

    // if imagePlane exists, set row and col pixel spacing
    if (imagePlane) {
      rowPixelSpacing =
        imagePlane.rowPixelSpacing || imagePlane.rowImagePixelSpacing;
      colPixelSpacing =
        imagePlane.columnPixelSpacing || imagePlane.colImagePixelSpacing;
    }

    // Check whether pixel spacing is defined
    if (!rowPixelSpacing || !colPixelSpacing) {
      console.warn(
        `Unable to define rowPixelSpacing or colPixelSpacing from data on ScaleOverlayTool's renderAnnotation`
      );
      return;
    }

    const canvasSize = {
      width: canvas.width,
      height: canvas.height,
    };

    // const zoomScale = 1.5 / size[1];
    // const deltaY = deltaPoints.canvas[1];
    // const k = deltaY * zoomScale;

    // let parallelScaleToSet = (1.0 - k) * parallelScale;
    // const t = element.clientHeight * colPixelSpacing * 0.5;
    // const scale = t / parallelScaleToSet;

    // Distance between intervals is 10mm
    // const verticalIntervalScale = (10.0 / rowPixelSpacing) * viewport.scale;
    // const horizontalIntervalScale = (10.0 / colPixelSpacing) * viewport.scale;

    // 0.1 and 0.05 gives margin to horizontal and vertical lines
    const hscaleBounds = computeScaleBounds(canvasSize, 0.25, 0.05);
    const vscaleBounds = computeScaleBounds(canvasSize, 0.05, 0.15);

    console.log(viewport);

    return;
  }
}

/**
 * Computes the max bound for scales on the image
 * @param  {{width: number, height: number}} canvasSize
 * @param  {number} horizontalReduction
 * @param  {number} verticalReduction
 * @returns {Object.<string, { x:number, y:number }>}
 */
const computeScaleBounds = (
  canvasSize,
  horizontalReduction,
  verticalReduction
) => {
  const hReduction = horizontalReduction * Math.min(1000, canvasSize.width);
  const vReduction = verticalReduction * Math.min(1000, canvasSize.height);
  const canvasBounds = {
    left: hReduction,
    top: vReduction,
    width: canvasSize.width - 2 * hReduction,
    height: canvasSize.height - 2 * vReduction,
  };

  return {
    topLeft: {
      x: canvasBounds.left,
      y: canvasBounds.top,
    },
    bottomRight: {
      x: canvasBounds.left + canvasBounds.width,
      y: canvasBounds.top + canvasBounds.height,
    },
  };
};

ScaleOverlayTool.toolName = 'ScaleOverlay';
export default ScaleOverlayTool;
