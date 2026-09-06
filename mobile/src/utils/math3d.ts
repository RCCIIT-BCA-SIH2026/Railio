export interface Point2D {
  x: number;
  y: number;
}

/**
 * Projects a 3D world coordinate into 2D screen space coordinates using
 * ARCore's View and Projection matrices.
 * 
 * @param worldX - Real-world X coordinate in meters
 * @param worldY - Real-world Y coordinate in meters 
 * @param worldZ - Real-world Z coordinate in meters
 * @param viewMatrix - 16-element float array from ARCore camera.getViewMatrix()
 * @param projectionMatrix - 16-element float array from ARCore camera.getProjectionMatrix()
 * @param screenWidth - Width of the React Native view in logical pixels
 * @param screenHeight - Height of the React Native view in logical pixels
 * @returns 2D pixel coordinates, or null if the point is behind the camera.
 */
export function project3DTo2D(
  worldX: number,
  worldY: number,
  worldZ: number,
  viewMatrix: number[],
  projectionMatrix: number[],
  screenWidth: number,
  screenHeight: number
): Point2D | null {
  if (!viewMatrix || !projectionMatrix || viewMatrix.length !== 16 || projectionMatrix.length !== 16) {
    return null;
  }

  // 1. Convert world coordinates to Camera Space using View Matrix
  // [x, y, z, 1.0] * ViewMatrix
  // Note: OpenGL matrices are column-major.
  const cx = viewMatrix[0] * worldX + viewMatrix[4] * worldY + viewMatrix[8] * worldZ + viewMatrix[12] * 1.0;
  const cy = viewMatrix[1] * worldX + viewMatrix[5] * worldY + viewMatrix[9] * worldZ + viewMatrix[13] * 1.0;
  const cz = viewMatrix[2] * worldX + viewMatrix[6] * worldY + viewMatrix[10] * worldZ + viewMatrix[14] * 1.0;
  const cw = viewMatrix[3] * worldX + viewMatrix[7] * worldY + viewMatrix[11] * worldZ + viewMatrix[15] * 1.0;

  // 2. Convert Camera Space to Clip Space using Projection Matrix
  const clipX = projectionMatrix[0] * cx + projectionMatrix[4] * cy + projectionMatrix[8] * cz + projectionMatrix[12] * cw;
  const clipY = projectionMatrix[1] * cx + projectionMatrix[5] * cy + projectionMatrix[9] * cz + projectionMatrix[13] * cw;
  const clipZ = projectionMatrix[2] * cx + projectionMatrix[6] * cy + projectionMatrix[10] * cz + projectionMatrix[14] * cw;
  const clipW = projectionMatrix[3] * cx + projectionMatrix[7] * cy + projectionMatrix[11] * cz + projectionMatrix[15] * cw;

  // 3. Prevent projection if the point is behind the camera (clipW <= 0)
  if (clipW <= 0) {
    return null;
  }

  // 4. Perspective Divide to get Normalized Device Coordinates (NDC)
  // NDC range is [-1.0, 1.0]
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;

  // 5. Map NDC to Screen Pixels
  // OpenGL coordinates: (0,0) is bottom-left. React Native coordinates: (0,0) is top-left.
  // We flip the Y-axis.
  const screenX = ((ndcX + 1.0) / 2.0) * screenWidth;
  const screenY = ((1.0 - ndcY) / 2.0) * screenHeight;

  return { x: screenX, y: screenY };
}
