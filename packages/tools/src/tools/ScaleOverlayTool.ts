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
  utilities as csUtils,
} from '@cornerstonejs/core';
import { ScaleOverlayAnnotation } from '../types/ToolSpecificAnnotationTypes';
import type { Types } from '@cornerstonejs/core';
import { filterViewportsWithToolEnabled } from '../utilities/viewportFilters';
import { addAnnotation } from '../stateManagement/annotation/annotationState';
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
import { StyleSpecifier } from '../types/AnnotationStyle';

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
    viewport: any;
    annotation: ScaleOverlayAnnotation;
  } | null = {} as any;
  isDrawing: boolean;
  isHandleOutsideImage: boolean;

  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        viewportId: '',
        minorTickLength: 12.5,
        majorTickLength: 25,
      },
    }
  ) {
    super(toolProps, defaultToolProps);
  }
  //DONE: ---------

  _init = (): void => {
    const renderingEngines = getRenderingEngines();
    const renderingEngine = renderingEngines[0];

    console.log('init has been run');

    console.log(renderingEngines);
    console.log(renderingEngine);
    if (!renderingEngine) {
      return;
    }

    let viewports = renderingEngine.getViewports();
    viewports = filterViewportsWithToolEnabled(viewports, this.getToolName());

    console.log(viewports);

    const viewport = viewports[0];
    console.log(viewport);

    if (!viewport) {
      return;
    }

    const { element } = viewport;
    const { viewUp, viewPlaneNormal } = viewport.getCamera();

    const viewportCanvasCornersInWorld =
      csUtils.getViewportImageCornersInWorld(viewport);

    console.log(viewportCanvasCornersInWorld);

    let annotation = this.editData.annotation;

    if (!annotation) {
      const newAnnotation: ScaleOverlayAnnotation = {
        metadata: {
          toolName: this.getToolName(),
          viewPlaneNormal: <Types.Point3>[...viewPlaneNormal],
          viewUp: <Types.Point3>[...viewUp],
          FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
          referencedImageId: null,
        },
        data: {
          handles: {
            points: viewportCanvasCornersInWorld,
          },
        },
      };

      addAnnotation(element, newAnnotation);
      annotation = newAnnotation;
    } else {
      this.editData.annotation.data.handles.points =
        viewportCanvasCornersInWorld;
    }

    this.editData = {
      viewport,
      renderingEngine,
      annotation,
    };

    // triggerAnnotationRenderForViewportIds(renderingEngine, viewports);
  };

  onSetToolEnabled = (): void => {
    console.log('Tool has been enabled');
    this._init();
  };

  onCameraModified = (evt: Types.EventTypes.CameraModifiedEvent): void => {
    // If the camera is modified, we need to update the reference lines
    // we really don't care which viewport triggered the
    // camera modification, since we want to update all of them
    // with respect to the targetViewport
    this._init();
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
    // const { viewport } = enabledElement;
    const { annotation, viewport } = this.editData;

    const { element } = viewport;
    const image = viewport.getImageData();
    const imageId = viewport.getCurrentImageId();
    const canvas = enabledElement.viewport.canvas;

    const viewportCanvasCornersInWorld =
      csUtils.getViewportImageCornersInWorld(viewport);

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

    const topLeft = annotation.data.handles.points[0];
    const topRight = annotation.data.handles.points[1];
    const bottomLeft = annotation.data.handles.points[2];
    const bottomRight = annotation.data.handles.points[3];

    const worldWidthViewport = Math.abs(bottomLeft[0] - bottomRight[0]);
    console.log(worldWidthViewport / 10);

    // 0.1 and 0.05 gives margin to horizontal and vertical lines
    const hscaleBounds = this.computeScaleBounds(canvasSize, 0.25, 0.05);
    const vscaleBounds = this.computeScaleBounds(canvasSize, 0.05, 0.05);
    // const canvasCoordinates = [topLeft, bottomRight].map((world) =>
    //   viewport.worldToCanvas(world)
    // );

    let canvasCoordinates;

    if (worldWidthViewport < 600) {
      canvasCoordinates = [
        [-100, 0, topRight[2]],
        [100, 0, topRight[2]],
      ].map((world) => viewport.worldToCanvas(world));
    } else {
      canvasCoordinates = [
        [-200, 0, topRight[2]],
        [200, 0, topRight[2]],
      ].map((world) => viewport.worldToCanvas(world));
    }

    const newCanvasCoordinates = this.computeCanvasScaleCoordinates(
      canvasSize,
      canvasCoordinates,
      vscaleBounds
    );
    console.log(newCanvasCoordinates);

    const { annotationUID } = annotation;

    styleSpecifier.annotationUID = annotationUID;
    const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
    const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
    const color = this.getStyle('color', styleSpecifier, annotation);
    const shadow = this.getStyle('shadow', styleSpecifier, annotation);

    const dataId = `${annotationUID}-line`;
    const lineUID = '1';
    drawLineSvg(
      svgDrawingHelper,
      annotationUID,
      lineUID,
      newCanvasCoordinates[0],
      newCanvasCoordinates[1],
      {
        color,
        width: lineWidth,
        lineDash,
        shadow,
      },
      dataId
    );

    return renderStatus;
  }

  /**
   * Computes the centered canvas coordinates for scale
   * @param canvasSize
   * @param canvasCoordinates
   * @param vscaleBounds
   * @returns newCanvasCoordinates
   */
  computeCanvasScaleCoordinates = (
    canvasSize,
    canvasCoordinates,
    vscaleBounds
  ) => {
    const worldDistanceOnCanvas =
      canvasCoordinates[0][0] - canvasCoordinates[1][0];
    const newCanvasCoordinates = [
      [canvasSize.width / 2 - worldDistanceOnCanvas / 2, vscaleBounds.height],
      [canvasSize.width / 2 + worldDistanceOnCanvas / 2, vscaleBounds.height],
    ];

    return newCanvasCoordinates;
  };

  /**
   * Computes the max bound for scales on the image
   * @param  {{width: number, height: number}} canvasSize
   * @param  {number} horizontalReduction
   * @param  {number} verticalReduction
   * @returns {Object.<string, { x:number, y:number }>}
   */
  computeScaleBounds = (canvasSize, horizontalReduction, verticalReduction) => {
    const hReduction = horizontalReduction * Math.min(1000, canvasSize.width);
    const vReduction = verticalReduction * Math.min(1000, canvasSize.height);
    const scaleBounds = {
      height: canvasSize.height - vReduction,
      width: canvasSize.width - hReduction,
    };

    return {
      height: scaleBounds.height,
      width: scaleBounds.width,
    };
  };
}
//   /**
//    * Computes the max bound for scales on the image
//    * @param  {{width: number, height: number}} canvasSize
//    * @param  {number} horizontalReduction
//    * @param  {number} verticalReduction
//    * @returns {Object.<string, { x:number, y:number }>}
//    */
//   computeScaleBounds = (canvasSize, horizontalReduction, verticalReduction) => {
//     const hReduction = horizontalReduction * Math.min(1000, canvasSize.width);
//     const vReduction = verticalReduction * Math.min(1000, canvasSize.height);
//     const canvasBounds = {
//       left: hReduction,
//       top: vReduction,
//       width: canvasSize.width - 2 * hReduction,
//       height: canvasSize.height - 2 * vReduction,
//     };

//     return {
//       topLeft: {
//         x: canvasBounds.left,
//         y: canvasBounds.top,
//       },
//       bottomRight: {
//         x: canvasBounds.left + canvasBounds.width,
//         y: canvasBounds.top + canvasBounds.height,
//       },
//     };
//   };
// }

ScaleOverlayTool.toolName = 'ScaleOverlay';
export default ScaleOverlayTool;
