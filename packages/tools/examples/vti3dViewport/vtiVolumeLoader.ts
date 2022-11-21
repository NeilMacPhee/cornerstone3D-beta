import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';

import '@kitware/vtk.js/Rendering/Profiles/Volume';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import { ImageVolume, Types } from '@cornerstonejs/core';

function createImageVolume(
  volumeType: string,
  dimensions: Types.Point3,
  spacing: Types.Point3,
  origin: Types.Point3,
  direction: Types.Mat3,
  scalarData: any,
  volumeId = 'NEW'
) {
  // let metadata: Types.Metadata;
  // let volume: ImageVolume;
  let hightBit = 0;
  let bitsStored = 0;

  console.log(volumeType);
  if (volumeType.indexOf('int8') >= 0) {
    hightBit = 7;
    bitsStored = 8;
  } else if (volumeType.indexOf('16') >= 0) {
    hightBit = 15;
    bitsStored = 16;
  } else if (volumeType.indexOf('32') >= 0) {
    hightBit = 31;
    bitsStored = 32;
  }

  const metadata = {
    BitsAllocated: bitsStored,
    BitsStored: bitsStored,
    HighBit: hightBit,
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
  const volume = new ImageVolume({
    volumeId,
    metadata,
    dimensions,
    spacing,
    origin,
    direction,
    scalarData,
    sizeInBytes: Math.floor((scalarData.length * bitsStored) / 8),
  });
  console.log('Volume Opened : ');
  console.log(volume);

  return volume;
}

function vtiVolumeLoader(volumeId: string, { imageIds }) {
  return {
    promise: new Promise((resolve, reject) => {
      try {
        const tokens = imageIds[0].split(':');
        const fetchGzip = false;
        const xml = true;
        tokens.shift();
        const url = tokens.join(':');
        // console.log('Url : ' + url);
        // console.log('Options : ');
        // console.log(options);
        let reader;
        if (xml) reader = vtkXMLImageDataReader.newInstance();
        else
          reader = vtkHttpDataSetReader.newInstance({ fetchGzip: fetchGzip });

        reader.setUrl(url).then(() => {
          const data = reader.getOutputData();
          const scalars = reader.getOutputData().getPointData().getScalars();
          console.log(data.getDimensions());
          console.log(scalars);
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
