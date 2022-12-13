import AnnotationDisplayTool from './base/AnnotationDisplayTool';
import { Events } from '../enums';
import {
  getEnabledElement,
  StackViewport,
  VolumeViewport,
  utilities,
  getEnabledElementByIds,
  getRenderingEngines,
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

    const { element } = sourceViewport;
    const { viewUp, viewPlaneNormal } = source.Viewport.getCamera();
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
    const { viewport: targetViewport } = enabledElement;
    const { annotation, sourceViewport } = this.editData;

    const renderStatus = false;

    if (!sourceViewport) {
      return renderStatus;
    }

    const styleSpecifier: StyleSpecifier = {
      toolGroupId: this.toolGroupId,
      toolName: this.getToolName(),
      viewportId: enabledElement.viewport.id,
    };

    console.log('Hello!');
    return;
  }

  renderToolData(evt) {
    const eventData = evt.detail;

    const context = getContext(eventData.canvasContext.canvas);
    const { image, viewport, element } = eventData;

    let rowPixelSpacing = image.rowPixelSpacing;
    let colPixelSpacing = image.columnPixelSpacing;
    // const imagePlane = external.cornerstone.metaData.get(
    //   'imagePlaneModule',
    //   image.imageId
    // );

    if (imagePlane) {
      rowPixelSpacing =
        imagePlane.rowPixelSpacing || imagePlane.rowImagePixelSpacing;
      colPixelSpacing =
        imagePlane.columnPixelSpacing || imagePlane.colImagePixelSpacing;
    }

    // Check whether pixel spacing is defined
    if (!rowPixelSpacing || !colPixelSpacing) {
      console.warn(
        `unable to define rowPixelSpacing or colPixelSpacing from data on ${this.name}'s renderToolData`
      );

      return;
    }

    const canvasSize = {
      width: context.canvas.width,
      height: context.canvas.height,
    };

    // Distance between intervals is 10mm
    const verticalIntervalScale = (10.0 / rowPixelSpacing) * viewport.scale;
    const horizontalIntervalScale = (10.0 / colPixelSpacing) * viewport.scale;

    // 0.1 and 0.05 gives margin to horizontal and vertical lines
    const hscaleBounds = computeScaleBounds(canvasSize, 0.25, 0.05);
    const vscaleBounds = computeScaleBounds(canvasSize, 0.05, 0.15);

    if (
      !canvasSize.width ||
      !canvasSize.height ||
      !hscaleBounds ||
      !vscaleBounds
    ) {
      return;
    }

    const color = 'white';
    const lineWidth = 1;

    const imageAttributes = Object.assign(
      {},
      {
        hscaleBounds,
        vscaleBounds,
        verticalMinorTick: verticalIntervalScale,
        horizontalMinorTick: horizontalIntervalScale,
        verticalLine: {
          start: {
            x: vscaleBounds.bottomRight.x,
            y: vscaleBounds.topLeft.y,
          },
          end: {
            x: vscaleBounds.bottomRight.x,
            y: vscaleBounds.bottomRight.y,
          },
        },
        horizontalLine: {
          start: {
            x: hscaleBounds.topLeft.x,
            y: hscaleBounds.bottomRight.y,
          },
          end: {
            x: hscaleBounds.bottomRight.x,
            y: hscaleBounds.bottomRight.y,
          },
        },
        color,
        lineWidth,
      },
      this.configuration
    );

    // draw(context, (context) => {
    //   setShadow(context, imageAttributes);

    //   // Draw vertical line
    //   drawLine(
    //     context,
    //     element,
    //     imageAttributes.verticalLine.start,
    //     imageAttributes.verticalLine.end,
    //     {
    //       color: imageAttributes.color,
    //       lineWidth: imageAttributes.lineWidth,
    //     },
    //     'canvas'
    //   );
    //   drawVerticalScalebarIntervals(context, element, imageAttributes);

    //   // Draw horizontal line
    //   drawLine(
    //     context,
    //     element,
    //     imageAttributes.horizontalLine.start,
    //     imageAttributes.horizontalLine.end,
    //     {
    //       color: imageAttributes.color,
    //       lineWidth: imageAttributes.lineWidth,
    //     },
    //     'canvas'
    //   );
    //   drawHorizontalScalebarIntervals(context, element, imageAttributes);
    // });
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
