/** CAD / 3D exchange formats for comms (SolidWorks 3DExperience–style sharing). */

export const COMMS_CAD_3D_EXTENSIONS = [
  "stl",
  "obj",
  "step",
  "stp",
  "iges",
  "igs",
  "glb",
  "gltf",
  "ply",
  "3mf",
  "fbx",
  "dae",
  "x_t",
  "x_b",
  "sldprt",
  "sldasm",
  "slddrw",
  "jt",
  "amf",
  "off",
  "wrl",
  "vrml",
] as const;

export type CommsCadExtension = (typeof COMMS_CAD_3D_EXTENSIONS)[number];

/** Browser preview via Three.js loaders */
export const COMMS_CAD_PREVIEW_EXTENSIONS = ["stl", "obj", "glb", "gltf", "ply", "3mf", "dae"] as const;

export type CommsCadPreviewFormat = (typeof COMMS_CAD_PREVIEW_EXTENSIONS)[number];

const EXT_LABEL: Record<string, string> = {
  stl: "STL mesh",
  obj: "Wavefront OBJ",
  step: "STEP",
  stp: "STEP",
  iges: "IGES",
  igs: "IGES",
  glb: "glTF binary",
  gltf: "glTF",
  ply: "PLY mesh",
  "3mf": "3MF",
  fbx: "FBX",
  dae: "COLLADA",
  x_t: "Parasolid",
  x_b: "Parasolid binary",
  sldprt: "SolidWorks part",
  sldasm: "SolidWorks assembly",
  slddrw: "SolidWorks drawing",
  jt: "JT",
  amf: "AMF",
  off: "OFF mesh",
  wrl: "VRML",
  vrml: "VRML",
};

const EXT_MIME: Record<string, string> = {
  stl: "model/stl",
  obj: "model/obj",
  step: "application/step",
  stp: "application/step",
  iges: "model/iges",
  igs: "model/iges",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  ply: "application/ply",
  "3mf": "application/3mf",
  fbx: "application/octet-stream",
  dae: "model/vnd.collada+xml",
  x_t: "application/octet-stream",
  x_b: "application/octet-stream",
  sldprt: "application/octet-stream",
  sldasm: "application/octet-stream",
  slddrw: "application/octet-stream",
  jt: "application/octet-stream",
  amf: "application/amf+xml",
  off: "application/octet-stream",
  wrl: "model/vrml",
  vrml: "model/vrml",
};

export function getCommsCadExtension(fileName?: string | null): string | null {
  if (!fileName) return null;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return COMMS_CAD_3D_EXTENSIONS.includes(ext as CommsCadExtension) ? ext : null;
}

export function isCommsCad3dFile(fileName?: string | null, mimeType?: string | null): boolean {
  if (getCommsCadExtension(fileName)) return true;
  const mt = (mimeType || "").toLowerCase();
  return (
    mt.startsWith("model/") ||
    mt.includes("step") ||
    mt.includes("iges") ||
    mt.includes("gltf") ||
    mt.includes("3mf") ||
    mt.includes("stl") ||
    mt.includes("vrml")
  );
}

export function getCommsCadPreviewFormat(
  fileName?: string | null,
  mimeType?: string | null,
): CommsCadPreviewFormat | null {
  const ext = getCommsCadExtension(fileName);
  if (ext && (COMMS_CAD_PREVIEW_EXTENSIONS as readonly string[]).includes(ext)) {
    return ext as CommsCadPreviewFormat;
  }
  const mt = (mimeType || "").toLowerCase();
  if (mt.includes("gltf") && mt.includes("binary")) return "glb";
  if (mt.includes("gltf")) return "gltf";
  if (mt.includes("stl")) return "stl";
  if (mt.includes("obj")) return "obj";
  if (mt.includes("ply")) return "ply";
  if (mt.includes("3mf")) return "3mf";
  if (mt.includes("collada")) return "dae";
  return null;
}

export function getCommsCadFormatLabel(fileName?: string | null): string {
  const ext = getCommsCadExtension(fileName);
  if (!ext) return "3D model";
  return EXT_LABEL[ext] || ext.toUpperCase();
}

export function guessCommsCadMime(fileName?: string | null): string | undefined {
  const ext = getCommsCadExtension(fileName);
  if (!ext) return undefined;
  return EXT_MIME[ext];
}

/** File-picker accept fragment for CAD extensions */
export const COMMS_CAD_FILE_ACCEPT =
  ".stl,.obj,.step,.stp,.iges,.igs,.glb,.gltf,.ply,.3mf,.fbx,.dae," +
  ".x_t,.x_b,.sldprt,.sldasm,.slddrw,.jt,.amf,.off,.wrl,.vrml";
