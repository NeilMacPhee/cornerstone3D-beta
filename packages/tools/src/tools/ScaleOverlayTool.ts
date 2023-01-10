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
import {
  drawLine as drawLineSvg,
  drawTextBox as drawTextBoxSvg,
} from '../drawingSvg';
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

    if (!renderingEngine) {
      return;
    }

    let viewports = renderingEngine.getViewports();
    viewports = filterViewportsWithToolEnabled(viewports, this.getToolName());

    const viewport = viewports[0];

    if (!viewport) {
      return;
    }

    const { element } = viewport;
    const { viewUp, viewPlaneNormal } = viewport.getCamera();

    const viewportCanvasCornersInWorld =
      csUtils.getViewportImageCornersInWorld(viewport);

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
    // console.log(worldWidthViewport / 10);

    // 0.1 and 0.05 gives margin to horizontal and vertical lines
    const hscaleBounds = this.computeScaleBounds(canvasSize, 0.25, 0.05);
    const vscaleBounds = this.computeScaleBounds(canvasSize, 0.05, 0.05);
    // const canvasCoordinates = [topLeft, bottomRight].map((world) =>
    //   viewport.worldToCanvas(world)
    // );

    const scaleSize = this.computeScaleSize(worldWidthViewport);

    const canvasCoordinates = [
      [-scaleSize / 2, 0, topRight[2]],
      [scaleSize / 2, 0, topRight[2]],
    ].map((world) => viewport.worldToCanvas(world));

    const newCanvasCoordinates = this.computeCanvasScaleCoordinates(
      canvasSize,
      canvasCoordinates,
      vscaleBounds
    );

    const scaleTicks = this.computeEndScaleTicks(newCanvasCoordinates);

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
    const leftTickId = `${annotationUID}-left`;
    const leftTickUID = '2';

    drawLineSvg(
      svgDrawingHelper,
      annotationUID,
      leftTickUID,
      scaleTicks.left[0],
      scaleTicks.left[1],
      {
        color,
        width: lineWidth,
        lineDash,
        shadow,
      },
      leftTickId
    );
    const rightTickId = `${annotationUID}-right`;
    const rightTickUID = '3';

    drawLineSvg(
      svgDrawingHelper,
      annotationUID,
      rightTickUID,
      scaleTicks.right[0],
      scaleTicks.right[1],
      {
        color,
        width: lineWidth,
        lineDash,
        shadow,
      },
      rightTickId
    );

    const textCanvasCoordinates = [
      newCanvasCoordinates[0][0] - 10,
      newCanvasCoordinates[0][1] - 42,
    ];
    const textLines = this._getTextLines(scaleSize);

    const { tickIds, tickUIDs, tickCoordinates } = this.computeInnerScaleTicks(
      scaleSize,
      newCanvasCoordinates,
      annotationUID,
      scaleTicks.left,
      scaleTicks.right
    );

    // draws inner ticks for scale
    for (let i = 0; i < tickUIDs.length; i++) {
      drawLineSvg(
        svgDrawingHelper,
        annotationUID,
        tickUIDs[i],
        tickCoordinates[i][0],
        tickCoordinates[i][1],
        {
          color,
          width: lineWidth,
          lineDash,
          shadow,
        },
        tickIds[i]
      );
    }

    const textUID = '0';
    drawTextBoxSvg(
      svgDrawingHelper,
      annotationUID,
      textUID,
      textLines,
      [textCanvasCoordinates[0], textCanvasCoordinates[1]],
      {
        fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
        fontSize: '14px',
        lineDash: '2,3',
        lineWidth: '1',
        shadow: true,
      }
    );

    return renderStatus;
  }

  _getTextLines(scaleSize): string[] | undefined {
    let scaleSizeDisplayValue;
    let scaleSizeUnits;
    if (scaleSize >= 50) {
      scaleSizeDisplayValue = scaleSize / 10; //convert to cm
      scaleSizeUnits = ' cm';
    } else {
      scaleSizeDisplayValue = scaleSize; //convert to cm
      scaleSizeUnits = ' mm';
    }

    const textLines = [scaleSizeDisplayValue.toString().concat(scaleSizeUnits)];

    return textLines;
  }

  /**
   *
   * @param worldWidthViewport
   * @returns currentScaleSize
   */
  computeScaleSize = (worldWidthViewport) => {
    const scaleSizes = [1000, 500, 250, 100, 50, 25, 10, 5];
    const currentScaleSize = scaleSizes.filter(
      (scaleSize) =>
        scaleSize < worldWidthViewport * 0.6 &&
        scaleSize > worldWidthViewport * 0.2
    );

    return currentScaleSize[0];
  };

  /**
   *  calculates scale ticks for ends of the scale
   * @param canvasCoordinates
   * @returns leftTick, rightTick
   */
  computeEndScaleTicks = (canvasCoordinates) => {
    const leftTick = [
      [canvasCoordinates[1][0], canvasCoordinates[1][1]],
      [canvasCoordinates[1][0], canvasCoordinates[1][1] - 10],
    ];
    const rightTick = [
      [canvasCoordinates[0][0], canvasCoordinates[0][1]],
      [canvasCoordinates[0][0], canvasCoordinates[0][1] - 10],
    ];
    return {
      left: leftTick,
      right: rightTick,
    };
  };

  computeInnerScaleTicks = (
    scaleSize,
    canvasCoordinates,
    annotationUID,
    leftTick,
    rightTick
  ) => {
    // let numberSmallTicks;
    const canvasScaleSize = rightTick[0][0] - leftTick[0][0];
    const tickIds = [];
    const tickUIDs = [];
    const tickCoordinates = [];

    if (scaleSize >= 50) {
      const numberSmallTicks = scaleSize / 10;
      const tickSpacing = canvasScaleSize / numberSmallTicks;
      for (let i = 0; i < numberSmallTicks - 1; i++) {
        tickIds.push(`${annotationUID}-tick${i}`);
        tickUIDs.push(`tick${i}`);
        if ((i + 1) % 5 == 0) {
          tickCoordinates.push([
            [leftTick[0][0] + tickSpacing * (i + 1), leftTick[0][1]],
            [leftTick[1][0] + tickSpacing * (i + 1), leftTick[1][1]],
          ]);
        } else {
          tickCoordinates.push([
            [leftTick[0][0] + tickSpacing * (i + 1), leftTick[0][1]],
            [leftTick[1][0] + tickSpacing * (i + 1), leftTick[1][1] + 5],
          ]);
        }
      }
    } else {
      const numberSmallTicks = scaleSize;
      const tickSpacing = canvasScaleSize / numberSmallTicks;
      for (let i = 0; i < numberSmallTicks - 1; i++) {
        tickIds.push(`${annotationUID}-tick${i}`);
        tickUIDs.push(`tick${i}`);
        if ((i + 1) % 5 == 0) {
          tickCoordinates.push([
            [leftTick[0][0] + tickSpacing * (i + 1), leftTick[0][1]],
            [leftTick[1][0] + tickSpacing * (i + 1), leftTick[1][1]],
          ]);
        } else {
          tickCoordinates.push([
            [leftTick[0][0] + tickSpacing * (i + 1), leftTick[0][1]],
            [leftTick[1][0] + tickSpacing * (i + 1), leftTick[1][1] + 5],
          ]);
        }
      }
    }

    return { tickIds, tickUIDs, tickCoordinates };
  };
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

ScaleOverlayTool.toolName = 'ScaleOverlay';
export default ScaleOverlayTool;
