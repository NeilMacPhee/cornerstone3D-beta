import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import { ImageVolume, Types } from '@cornerstonejs/core';

function createImageVolume(
  tipo: string,
  dimensions: Types.Point3,
  spacing: Types.Point3,
  origin: Types.Point3,
  direction: Types.Mat3,
  scalarData: any,
  volumeId = 'NEW'
) {
  let metadata: Types.Metadata;
  let volume: ImageVolume;
  if (tipo === 'Uint8Array') {
    metadata = {
      BitsAllocated: 8,
      BitsStored: 8,
      HighBit: 7,
      ImageOrientationPatient: [0, 0, 1, 1, 0, 0, 0, 1, 0],
      SamplesPerPixel: 1,
      PhotometricInterpretation: 'MONOCHROME2',
      PixelRepresentation: 0,
      Modality: 'SC',
      PixelSpacing: spacing,
      FrameOfReferenceUID: '11111',
      Columns: dimensions[0],
      Rows: dimensions[1],
      voiLut: [],
    };
    volume = new ImageVolume({
      volumeId,
      metadata,
      dimensions,
      spacing,
      origin,
      direction,
      scalarData,
      sizeInBytes: scalarData.length,
    });
    return volume;
  }
}

function vtiVolumeLoader(volumeId: string, options?: Record<string, any>) {
  return {
    promise: new Promise((resolve, reject) => {
      try {
        console.log(`vti options`);
        // console.log(options);
        console.log(options['imageIds'][0]);
        const tokens = options['imageIds'][0].split(':');
        tokens.shift();
        const url = tokens.join(':');
        console.log(url);
        const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
        reader
          .setUrl(url)
          .then(() => reader.loadData())
          .then(() => {
            const data = reader.getOutputData();
            const scalars = reader.getOutputData().getPointData().getScalars();
            resolve(
              createImageVolume(
                scalars.getDataType() as string,
                data.getDimensions() as Types.Point3,
                data.getSpacing() as Types.Point3,
                data.getOrigin() as Types.Point3,
                data.getDirection() as Types.Mat3,
                scalars.getData(),
                volumeId
              )
            );
          });
      } catch (error: unknown) {
        reject(error);
      }
    }),
  };
}

export { vtiVolumeLoader };
