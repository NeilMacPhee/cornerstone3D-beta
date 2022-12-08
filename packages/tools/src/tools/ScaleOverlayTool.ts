import { BaseTool } from './base';
import { Events } from '../enums';
import {
  getEnabledElement,
  StackViewport,
  VolumeViewport,
  utilities,
  getEnabledElementByIds,
} from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { drawLine } from '../drawingSvg';
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

const SCALEOVERLAYTOOL_ID = 'scaleoverlay-viewport';

/**
 * @public
 * @class ScaleOverlayTool
 * @memberof Tools
 *
 * @classdesc Tool for displaying a scale overlay on the image.
 * @extends Tools.Base.BaseTool
 */
class ScaleOverlayTool extends BaseTool {
  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        minorTickLength: 12.5,
        majorTickLength: 25,
      },
    }
  ) {
    super(toolProps, defaultToolProps);
  }
  //DONE:

  enabledCallback(element) {
    this.forceImageUpdate(element);
  }

  disabledCallback(element) {
    this.forceImageUpdate(element);
  }

  forceImageUpdate(element) {
    //TODO: find modern version of update image
    const enabledElement = getEnabledElement(element);

    if (enabledElement.image) {
      external.cornerstone.updateImage(element);
    }
  }

  renderToolData(evt) {
    const eventData = evt.detail;

    const context = getNewContext(eventData.canvasContext.canvas);
    const { image, viewport, element } = eventData;

    let rowPixelSpacing = image.rowPixelSpacing;
    let colPixelSpacing = image.columnPixelSpacing;
    const imagePlane = external.cornerstone.metaData.get(
      'imagePlaneModule',
      image.imageId
    );

    if (imagePlane) {
      rowPixelSpacing =
        imagePlane.rowPixelSpacing || imagePlane.rowImagePixelSpacing;
      colPixelSpacing =
        imagePlane.columnPixelSpacing || imagePlane.colImagePixelSpacing;
    }

    // Check whether pixel spacing is defined
    if (!rowPixelSpacing || !colPixelSpacing) {
      logger.warn(
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

    const color = toolColors.getToolColor();
    const lineWidth = toolStyle.getToolWidth();

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

    draw(context, (context) => {
      setShadow(context, imageAttributes);

      // Draw vertical line
      drawLine(
        context,
        element,
        imageAttributes.verticalLine.start,
        imageAttributes.verticalLine.end,
        {
          color: imageAttributes.color,
          lineWidth: imageAttributes.lineWidth,
        },
        'canvas'
      );
      drawVerticalScalebarIntervals(context, element, imageAttributes);

      // Draw horizontal line
      drawLine(
        context,
        element,
        imageAttributes.horizontalLine.start,
        imageAttributes.horizontalLine.end,
        {
          color: imageAttributes.color,
          lineWidth: imageAttributes.lineWidth,
        },
        'canvas'
      );
      drawHorizontalScalebarIntervals(context, element, imageAttributes);
    });
  }
}
