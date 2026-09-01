import { useEffect, useRef } from 'react';
import {
  TerraDraw,
  TerraDrawCircleMode,
  TerraDrawPolygonMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

let mapElementSequence = 0;

class ReactGoogleMapsTerraDrawAdapter extends TerraDrawGoogleMapsAdapter {
  constructor(options) {
    super(options);
    this.mapElement = options.map.getDiv();
  }

  getMapEventElement(eventName) {
    return super.getMapEventElement(eventName)
      || this.mapElement.querySelector('.gm-style')
      || this.mapElement;
  }
}

const TerraDrawOverlay = ({ map, activeMode, onFeatureComplete, enableCircle = false }) => {
  const drawRef = useRef(null);
  const readyRef = useRef(false);
  const activeModeRef = useRef(activeMode);
  const onFeatureCompleteRef = useRef(onFeatureComplete);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    onFeatureCompleteRef.current = onFeatureComplete;
  }, [onFeatureComplete]);

  useEffect(() => {
    if (!map || !window.google?.maps) return undefined;

    const mapElement = map.getDiv();
    if (!mapElement.id) {
      mapElementSequence += 1;
      mapElement.id = `terra-draw-google-map-${mapElementSequence}`;
    }

    const modes = [
      new TerraDrawPolygonMode({
        styles: {
          fillColor: '#4f46e5',
          fillOpacity: 0.18,
          outlineColor: '#4f46e5',
          outlineWidth: 2,
        },
      }),
    ];

    if (enableCircle) {
      modes.push(
        new TerraDrawCircleMode({
          drawInteraction: 'click-move-or-drag',
          styles: {
            fillColor: '#0f766e',
            fillOpacity: 0.18,
            outlineColor: '#0f766e',
            outlineWidth: 2,
          },
        }),
      );
    }

    const draw = new TerraDraw({
      adapter: new ReactGoogleMapsTerraDrawAdapter({
        map,
        lib: window.google.maps,
        coordinatePrecision: 9,
        ignoreMismatchedPointerEvents: true,
      }),
      modes,
    });

    drawRef.current = draw;
    draw.start();

    draw.on('ready', () => {
      readyRef.current = true;
      const mode = activeModeRef.current;
      draw.setMode(mode === 'polygon' || (enableCircle && mode === 'circle') ? mode : 'static');
    });

    draw.on('finish', (id, context) => {
      if (context.action !== 'draw') return;

      const feature = draw.getSnapshotFeature(id);
      if (feature) {
        onFeatureCompleteRef.current?.(feature, context.mode);
      }
      if (draw.hasFeature(id)) {
        draw.removeFeatures([id]);
      }
      draw.setMode('static');
    });

    return () => {
      readyRef.current = false;
      draw.stop();
      drawRef.current = null;
    };
  }, [enableCircle, map]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !readyRef.current) return;

    const nextMode = activeMode === 'polygon' || (enableCircle && activeMode === 'circle')
      ? activeMode
      : 'static';
    if (draw.getMode() !== nextMode) {
      draw.setMode(nextMode);
    }
  }, [activeMode, enableCircle]);

  return null;
};

export default TerraDrawOverlay;
