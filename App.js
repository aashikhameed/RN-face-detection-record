/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Button, StyleSheet, View} from 'react-native';
import {runOnJS} from 'react-native-reanimated';

import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {scanFaces} from 'vision-camera-face-detector';

const App = () => {
  const cameraRef = useRef(null);
  const [faceRecVal, setFaceValues] = useState({});
  const faceValuesRef = useRef({}); // use this to stop multiple state updation within secs
  const [isRecording, setIsRecording] = useState(false);
  const isUserStoppedRef = useRef(false);

  const devices = useCameraDevices();
  const frontCamera = devices.front;

  useEffect(() => {
    if (Object.keys(faceRecVal).length === 4) {
      stopRecording();
    }
  }, [faceRecVal]);

  useEffect(() => {
    Camera.requestCameraPermission().then(res => {
      // setCameraEnabled(true);
    });
    return () => {
      // unmount
      stopRecording();
    };
  }, []);

  const onInitialized = () => {
    console.log('Initialized......');
  };

  const onError = e => {
    console.log('Error....', e);
  };

  const onFaceAngles = data => {
    if (data.length < 1 && data.length > 1 && !isRecording) {
      return;
    }
    console.log('Face Detected', Math.round(data[0]?.yawAngle));

    let checked = null;
    if (
      Math.round(data[0]?.yawAngle) >= -1 &&
      Math.round(data[0]?.yawAngle) <= -0
    ) {
      checked = 'bottomRecognized';
    }
    if (
      Math.round(data[0]?.yawAngle) >= -4 &&
      Math.round(data[0]?.yawAngle) <= -3
    ) {
      checked = 'topRecognized';
    }
    if (
      Math.round(data[0]?.yawAngle) >= -40 &&
      Math.round(data[0]?.yawAngle) <= -35
    ) {
      checked = 'rightRecognized';
    }
    if (Math.round(data[0]?.yawAngle) >= 36) {
      checked = 'leftRecognized';
    }
    if (checked && !faceValuesRef.current[checked]) {
      faceValuesRef.current = {
        ...faceValuesRef.current,
        [checked]: true,
      };
      setFaceValues(s => ({...s, [checked]: true}));
    }
  };

  const startRecording = useCallback(() => {
    cameraRef.current.startRecording({
      flash: 'on',
      onRecordingFinished: video => {
        if (!isUserStoppedRef.current) {
          Alert.alert(video.path);
        }
      },
      onRecordingError: error => console.error(error),
    });
  }, []);

  useEffect(() => {
    if (isRecording) {
      setTimeout(() => {
        startRecording();
      }, 1000);
    }
  }, [startRecording, isRecording]);

  const frameProcessorfn = useFrameProcessor(frame => {
    'worklet';
    const scannedFaces = scanFaces(frame);
    if (scannedFaces.length > 0) {
      runOnJS(onFaceAngles)(scannedFaces);
    }
  }, []);

  const progress = useMemo(() => {
    const length = Object.keys(faceRecVal).length;
    return length > 0 ? length / 4 : null;
  }, [faceRecVal]);

  const stopRecording = async () => {
    await cameraRef.current.stopRecording();
    faceValuesRef.current = {};
    setIsRecording(false);
    setFaceValues({});
  };

  const onPressStart = () => {
    faceValuesRef.current = {};
    isUserStoppedRef.current = false;
    setFaceValues({});
    setIsRecording(true);
  };

  const onPressStop = () => {
    isUserStoppedRef.current = true;
    stopRecording();
  };

  const faceProps = useMemo(() => {
    return isRecording
      ? {
          frameProcessor: frameProcessorfn,
        }
      : {};
  }, [isRecording, frameProcessorfn]);

  if (!frontCamera) {
    return <ActivityIndicator />;
  }

  return (
    <View style={styles.flex}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={frontCamera}
        isActive={true}
        video={true}
        orientation="portrait"
        frameProcessorFps={15}
        onInitialized={onInitialized}
        supportsParallelVideoProcessing
        onError={onError}
        {...faceProps}
      />

      {isRecording ? (
        <View style={styles.progressParentView}>
          <View style={styles.progressView(progress)} />
          <View style={{flex: progress - 4}} />
        </View>
      ) : null}
      <View style={[styles.startButton, {bottom: 80}]}>
        <Button title="Start" disabled={isRecording} onPress={onPressStart} />
      </View>
      <View style={styles.startButton}>
        <Button title="Stop" disabled={!isRecording} onPress={onPressStop} />
      </View>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  flex: {flex: 1},
  progressView: progress => ({
    flex: progress,
    backgroundColor: 'blue',
  }),
  progressParentView: {flexDirection: 'row', height: 4, backgroundColor: 'red'},
  startButton: {position: 'absolute', right: 0, left: 0, bottom: 30},
});
