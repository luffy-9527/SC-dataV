<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, withDefaults } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import type { AnimationType, CameraViewMode, FacialEmotion } from '../types'
import type { VisemeFrame } from '../composables/useSpeechSynthesis'

interface Props {
  animation: AnimationType
  emotion: FacialEmotion
  visemes: VisemeFrame
  cameraView: CameraViewMode
  modelType?: 'anime' | 'magical'
}

const props = withDefaults(defineProps<Props>(), {
  modelType: 'anime',
})

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'fpsUpdate', fps: number): void
  (e: 'actionFinished'): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(true)
const loadProgress = ref(0)

// Three.js instances
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let mixer: THREE.AnimationMixer | null = null
const actions: Record<string, THREE.AnimationAction> = {}
let currentAction: THREE.AnimationAction | null = null

// Meshes, Models & Bones
let currentModelGroup: THREE.Group | null = null
let headBone: THREE.Bone | null = null
let neckBone: THREE.Bone | null = null
let spineBone: THREE.Bone | null = null
let spine2Bone: THREE.Bone | null = null
let hipBone: THREE.Bone | null = null
const hairBonesR: THREE.Bone[] = []
const hairBonesL: THREE.Bone[] = []
const tieBones: THREE.Bone[] = []
let shoulderBoneR: THREE.Bone | null = null
let shoulderBoneL: THREE.Bone | null = null
let armBoneR: THREE.Bone | null = null
let armBoneL: THREE.Bone | null = null
let elbowBoneR: THREE.Bone | null = null
let elbowBoneL: THREE.Bone | null = null
let wristBoneR: THREE.Bone | null = null
let wristBoneL: THREE.Bone | null = null
let legBoneR: THREE.Bone | null = null
let legBoneL: THREE.Bone | null = null
let kneeBoneR: THREE.Bone | null = null
let kneeBoneL: THREE.Bone | null = null
let currentProceduralAction: AnimationType = 'Idle'
let proceduralActionTimer = 0
const skinnedMeshes: THREE.SkinnedMesh[] = []
let holographicStageGroup: THREE.Group | null = null
let particleSystem: THREE.Points | null = null
let holoBeamMesh: THREE.Mesh | null = null
let ring3Mesh: THREE.Mesh | null = null
let cyanRimLight: THREE.DirectionalLight | null = null
let purpleRimLight: THREE.DirectionalLight | null = null
let stageUpLightObj: THREE.SpotLight | null = null
let baseModelY = 0

// Timing
let animId: number | null = null
let lastTime = performance.now()
let frameCount = 0
let lastFpsTime = performance.now()

// Mouse tracking
let targetMouseX = 0
let targetMouseY = 0
let currentMouseX = 0
let currentMouseY = 0

// Natural eye blinking
let isBlinking = false
let blinkProgress = 0
let nextBlinkTime = performance.now() + 2000

// Emotion morph targets fallback
const EMOTION_MORPHS: Record<FacialEmotion, Record<string, number>> = {
  default: { mouthSmile: 0.12, browInnerUp: 0, jawOpen: 0 },
  smile: { mouthSmile: 0.5, browInnerUp: 0.15, jawOpen: 0.05 },
  surprised: { mouthSmile: 0, browInnerUp: 0.8, jawOpen: 0.35 },
  serious: { mouthSmile: -0.1, browInnerUp: -0.2, jawOpen: 0 },
  thinking: { mouthSmile: 0.05, browInnerUp: 0.35, jawOpen: 0 },
}

function initScene() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth || window.innerWidth
  const height = containerRef.value.clientHeight || window.innerHeight

  // 1. Scene
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x040814, 0.045)

  // 2. Camera - Positioned so Miku & Pedestal are beautifully framed above subtitle dock
  camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50)
  camera.position.set(0, 0.98, 2.65)

  // 3. Renderer with balanced Cel-shading exposure (eliminates chalky white bleaching)
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    precision: 'mediump',
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = false
  containerRef.value.appendChild(renderer.domElement)

  // 4. Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.maxPolarAngle = Math.PI / 2 + 0.05
  controls.minDistance = 0.8
  controls.maxDistance = 5.0
  controls.target.set(0, 0.78, 0)
  controls.update()

  // 5. Lighting with soft warm key and neon rims
  setupLighting()

  // 6. Holographic Stage
  setupHolographicStage()

  // 7. Load Hatsune Miku Model
  loadMikuModel(props.modelType)

  // 8. Event Listeners
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('mousemove', onMouseMove)

  // 9. Start Render Loop
  lastTime = performance.now()
  animate()
}

function setupLighting() {
  if (!scene) return

  // Ambient soft cyber light
  const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.9)
  scene.add(ambientLight)

  // Front Key Light (Soft warm anime key light)
  const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.1)
  keyLight.position.set(1.4, 2.2, 2.0)
  keyLight.castShadow = false
  scene.add(keyLight)

  // Front Direct Face Beauty Light (柔和正前脸部专属美颜补光，让面部通透红润白皙)
  const faceBeautyLight = new THREE.DirectionalLight(0xfff4ec, 0.95)
  faceBeautyLight.position.set(0, 1.35, 2.3)
  scene.add(faceBeautyLight)

  // Front-Left Soft Sky-Blue Fill Light
  const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.75)
  fillLight.position.set(-1.6, 1.6, 1.8)
  scene.add(fillLight)

  // Left Cyan Rim Light (Neon edge glow on twintails)
  cyanRimLight = new THREE.DirectionalLight(0x00f2fe, 1.6)
  cyanRimLight.position.set(-2.2, 1.8, -1.2)
  scene.add(cyanRimLight)

  // Right Purple Rim Light (Magenta neon edge on twintails)
  purpleRimLight = new THREE.DirectionalLight(0xc084fc, 1.3)
  purpleRimLight.position.set(2.2, 1.8, -1.2)
  scene.add(purpleRimLight)

  // Stage upward uplight from pedestal
  stageUpLightObj = new THREE.SpotLight(0x00f2fe, 3.2, 3.0, Math.PI / 3.5, 0.6, 1.2)
  stageUpLightObj.position.set(0, -0.05, 0)
  stageUpLightObj.target.position.set(0, 1.0, 0)
  scene.add(stageUpLightObj)
  scene.add(stageUpLightObj.target)
}

function updateStageLighting(type: 'anime' | 'magical') {
  if (type === 'magical') {
    // 魔法未来Live 风格：演唱会紫粉电光与霓虹
    if (stageUpLightObj) {
      stageUpLightObj.color.setHex(0xec4899)
      stageUpLightObj.intensity = 3.8
    }
    if (cyanRimLight) {
      cyanRimLight.color.setHex(0xa855f7)
      cyanRimLight.intensity = 1.8
    }
    if (purpleRimLight) {
      purpleRimLight.color.setHex(0xf43f5e)
      purpleRimLight.intensity = 1.6
    }
    if (holoBeamMesh) {
      (holoBeamMesh.material as THREE.MeshBasicMaterial).color.setHex(0xa855f7)
    }
    if (ring3Mesh) {
      (ring3Mesh.material as THREE.MeshBasicMaterial).color.setHex(0xec4899)
    }
  } else {
    // 全息数智专员 风格：冷青科技蓝
    if (stageUpLightObj) {
      stageUpLightObj.color.setHex(0x00f2fe)
      stageUpLightObj.intensity = 3.2
    }
    if (cyanRimLight) {
      cyanRimLight.color.setHex(0x00f2fe)
      cyanRimLight.intensity = 1.6
    }
    if (purpleRimLight) {
      purpleRimLight.color.setHex(0xc084fc)
      purpleRimLight.intensity = 1.3
    }
    if (holoBeamMesh) {
      (holoBeamMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00f2fe)
    }
    if (ring3Mesh) {
      (ring3Mesh.material as THREE.MeshBasicMaterial).color.setHex(0xa855f7)
    }
  }
}

function setupHolographicStage() {
  if (!scene) return

  holographicStageGroup = new THREE.Group()

  // 1. Center Glowing Tech Reticle Disc
  const discGeo = new THREE.CircleGeometry(1.05, 64)
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  disc.position.y = 0.01
  holographicStageGroup.add(disc)

  // 2. Inner Neon Cyan Ring with ticks
  const ring1Mat = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  })
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.86, 64), ring1Mat)
  ring1.rotation.x = -Math.PI / 2
  ring1.position.y = 0.02
  holographicStageGroup.add(ring1)

  // 3. Middle Segmented Reticle Ring
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  })
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.11, 64), ring2Mat)
  ring2.rotation.x = -Math.PI / 2
  ring2.position.y = 0.025
  holographicStageGroup.add(ring2)

  // 4. Outer Electric Purple Ring
  const ring3Mat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  })
  ring3Mesh = new THREE.Mesh(new THREE.RingGeometry(1.32, 1.35, 64), ring3Mat)
  ring3Mesh.rotation.x = -Math.PI / 2
  ring3Mesh.position.y = 0.02
  holographicStageGroup.add(ring3Mesh)

  // 5. Heavy Hexagonal Cyber Pedestal
  const hexGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.14, 6)
  const hexMat = new THREE.MeshStandardMaterial({
    color: 0x081326,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x002b4d,
    emissiveIntensity: 0.55,
  })
  const hexPedestal = new THREE.Mesh(hexGeo, hexMat)
  hexPedestal.position.y = -0.07
  hexPedestal.receiveShadow = true
  holographicStageGroup.add(hexPedestal)

  // 6. Holographic Light Beam Column (Vertical transparent cylinder)
  const beamGeo = new THREE.CylinderGeometry(0.95, 1.25, 2.8, 32, 1, true)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  holoBeamMesh = new THREE.Mesh(beamGeo, beamMat)
  holoBeamMesh.position.y = 1.4
  holographicStageGroup.add(holoBeamMesh)

  // 7. Four Corner Emitter Pillars around the pedestal
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4
    const x = Math.cos(angle) * 1.55
    const z = Math.sin(angle) * 1.55

    const pillarGeo = new THREE.BoxGeometry(0.06, 0.18, 0.06)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x00f2fe,
      emissiveIntensity: 0.8,
    })
    const pillar = new THREE.Mesh(pillarGeo, pillarMat)
    pillar.position.set(x, 0.02, z)
    holographicStageGroup.add(pillar)

    // Glowing tip
    const tipGeo = new THREE.SphereGeometry(0.02, 12, 12)
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe })
    const tip = new THREE.Mesh(tipGeo, tipMat)
    tip.position.set(x, 0.12, z)
    holographicStageGroup.add(tip)
  }

  scene.add(holographicStageGroup)

  // 8. Cybernetic Rising Particle Field
  const particleCount = 80
  const particleGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const speeds = new Float32Array(particleCount)
  const colors = new Float32Array(particleCount * 3)

  const c1 = new THREE.Color(0x00f2fe)
  const c2 = new THREE.Color(0xa855f7)
  const c3 = new THREE.Color(0x38bdf8)

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 0.15 + Math.random() * 1.15
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = Math.random() * 2.5
    positions[i * 3 + 2] = Math.sin(angle) * radius
    speeds[i] = 0.003 + Math.random() * 0.007

    const randC = Math.random()
    const color = randC > 0.6 ? c1 : randC > 0.25 ? c2 : c3
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particleGeo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const particleMat = new THREE.PointsMaterial({
    size: 0.024,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  particleSystem = new THREE.Points(particleGeo, particleMat)
  scene.add(particleSystem)
}

function resolveActionName(type: 'anime' | 'magical', anim: AnimationType): string {
  if (type === 'magical') {
    switch (anim) {
      case 'Idle':
        return 'PLA_slowUp.001' // 舞台待机微律动
      case 'Talking_0':
        return 'PLA_shakeDownSway' // 挥舞荧光棒讲解
      case 'Talking_1':
        return 'PLA_normal_shakeDown' // 热情互动打 call
      case 'Talking_2':
        return 'PLA_shakeDown_shakeUp' // 节拍起伏讲解
      case 'Laughing':
        return 'PLA_slowUp_songStart002' // 欢快舞台律动
      case 'Rumba':
        return 'PLA_shakeDownUp_wave' // 华丽演唱会 Wave 浪潮
      case 'StagePose':
        return 'PLA_songStart.001' // 经典 Live 开唱姿态
      case 'StageCheer':
        return 'PLA_songStart002_shakeDown' // 舞台全场大应援
      case 'Walk':
        return 'walk' // 舞台漫步
      case 'FocusPose':
        return 'PLA_shakeDownSway_slowUp' // 聚焦特写
      case 'Angry':
      case 'Crying':
      case 'Terrified':
        return 'PLA_normal_shakeUp' // 警觉与应急
      default:
        return 'PLA_slowUp.001'
    }
  }

  // anime 全息专员模型 (miku_bluearchive)
  switch (anim) {
    case 'Idle':
      return 'Cafe_Idle' // 优雅舒缓待机呼吸
    case 'Talking_0':
      return 'Cafe_Reaction' // 数据研判微点头讲解
    case 'Talking_1':
      return 'Cafe_Reaction' // 亲切手势挥手讲解
    case 'Talking_2':
      return 'Tactical_Start' // 战术端庄致意姿态
    case 'Laughing':
      return 'Cafe_Idle' // 亲切甜美微笑
    case 'Rumba':
      return 'Exs_Cutin' // 动感才艺旋律特写
    case 'StagePose':
      return 'Tactical_Start' // 舞台主奏独唱姿态
    case 'StageCheer':
      return 'Exs' // 舞台华丽应援与才艺大招
    case 'Walk':
      return 'Cafe_Walk' // 原地萌态巡台步
    case 'FocusPose':
      return 'Tactical_Start' // 眼神聚焦特写
    case 'Angry':
    case 'Crying':
    case 'Terrified':
      return 'Vital_Retreat' // 严谨警示与应急防御
    default:
      return 'Cafe_Idle'
  }
}

function getModelDefaultRotationY(): number {
  // 经典正统高精魔法未来 (Tda V4X) 原生朝向为 -Z，必须旋转 180 度 (Math.PI) 正面面对镜头和用户
  return props.modelType === 'magical' ? Math.PI : 0
}

function loadMikuModel(type: 'anime' | 'magical') {
  isLoading.value = true
  loadProgress.value = 20

  // 1. Cleanup old model and mixer if switching
  if (currentModelGroup && scene) {
    scene.remove(currentModelGroup)
    currentModelGroup = null
  }
  if (mixer) {
    mixer.stopAllAction()
    mixer = null
  }
  headBone = null
  neckBone = null
  spineBone = null
  spine2Bone = null
  hipBone = null
  hairBonesR.length = 0
  hairBonesL.length = 0
  tieBones.length = 0
  shoulderBoneR = null
  shoulderBoneL = null
  armBoneR = null
  armBoneL = null
  elbowBoneR = null
  elbowBoneL = null
  wristBoneR = null
  wristBoneL = null
  legBoneR = null
  legBoneL = null
  kneeBoneR = null
  kneeBoneL = null
  currentProceduralAction = 'Idle'
  proceduralActionTimer = 0
  skinnedMeshes.length = 0
  Object.keys(actions).forEach((k) => delete actions[k])
  currentAction = null

  // 同步舞台声光电氛围
  updateStageLighting(type)

  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')

  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)

  // 根据形象类型真正分流加载模型资产：全息专员 (BlueArchive) vs 魔法未来Live (Magical)
  const modelPath = type === 'magical' ? '/models/miku_magical.glb' : '/models/miku_bluearchive.glb'

  gltfLoader.load(
    modelPath,
    (gltf) => {
      loadProgress.value = 85
      const model = gltf.scene
      currentModelGroup = model

      // Remove platform and weapon meshes completely from scene graph
      const toRemove: THREE.Object3D[] = []
      model.traverse((child) => {
        const cname = child.name.toLowerCase()
        if (cname.includes('platform') || cname.includes('weapon')) {
          child.visible = false
          toRemove.push(child)
        }

        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.castShadow = false
          mesh.receiveShadow = false
          mesh.frustumCulled = false

          if (mesh.material) {
            const rawMat = mesh.material as (THREE.MeshStandardMaterial | THREE.MeshBasicMaterial)
            const mat = rawMat.clone()
            mesh.material = mat

            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace
            }

            if (type === 'magical') {
              // 经典正统高精魔法未来 (Tda式初音未来 V4X)：极致二次元赛璐珞原画质感 + 硬件Early-Z加速
              mat.transparent = false
              mat.alphaTest = 0.35
              mat.depthWrite = true
              mat.side = THREE.FrontSide

              if ((mat as any).isMeshBasicMaterial) {
                const stdMat = new THREE.MeshStandardMaterial({
                  map: mat.map,
                  transparent: false,
                  alphaTest: 0.35,
                  depthWrite: true,
                  side: THREE.FrontSide,
                  roughness: 0.52,
                  metalness: 0.04,
                  emissive: new THREE.Color(0x150b28),
                  emissiveIntensity: 0.1,
                })
                mesh.material = stdMat
              }
            } else {
              // 全息数智专员 经典二次元手办级饱满质感
              const stdMat = mat as THREE.MeshStandardMaterial
              const mname = (stdMat.name || child.name || '').toLowerCase()
              const isHair = mname.includes('hair')
              const isFace = mname.includes('face') || mname.includes('skin')
              const isEye = mname.includes('eye') || mname.includes('mouth')
              const isOutline = mname.includes('outline')
              const isBody = mname.includes('body') || mname.includes('skirt') || mname.includes('shirt') || mname.includes('tie') || mname.includes('sox') || mname.includes('arm')

              if (isHair) {
                stdMat.roughness = 0.42
                stdMat.metalness = 0.04
                stdMat.emissive = new THREE.Color(0x005963)
                stdMat.emissiveIntensity = 0.12
              } else if (isFace || isEye) {
                stdMat.roughness = 0.6
                stdMat.metalness = 0.0
              } else if (isOutline) {
                stdMat.color = new THREE.Color(0x0f172a)
              } else if (isBody) {
                stdMat.roughness = 0.65
                stdMat.metalness = 0.06
              }
            }
          }
        }

        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          skinnedMeshes.push(child as THREE.SkinnedMesh)
        }

        if ((child as THREE.Bone).isBone) {
          const bone = child as THREE.Bone
          const bname = bone.name
          if (bname === 'Bip001 Head' || bname === 'BoneHead' || bname === 'Head' || bname === '頭' || bname.toLowerCase().includes('head')) {
            headBone = bone
          } else if (bname === '首' || bname.toLowerCase().includes('neck')) {
            neckBone = bone
          } else if (bname === '上半身' || bname.toLowerCase().includes('spine')) {
            spineBone = bone
          } else if (bname === '上半身2') {
            spine2Bone = bone
          } else if (bname === '下半身' || bname === '腰' || bname === 'センター' || bname.toLowerCase().includes('pelvis') || bname.toLowerCase().includes('hip')) {
            if (!hipBone) hipBone = bone
          } else if (bname.includes('右髪')) {
            bone.rotation.set(0, 0, 0)
            hairBonesR.push(bone)
          } else if (bname.includes('左髪')) {
            bone.rotation.set(0, 0, 0)
            hairBonesL.push(bone)
          } else if (bname.includes('ﾈｸﾀｲ')) {
            bone.rotation.set(0, 0, 0)
            tieBones.push(bone)
          } else if (bname === '右肩' || bname.toLowerCase().includes('shoulder_r')) {
            shoulderBoneR = bone
          } else if (bname === '左肩' || bname.toLowerCase().includes('shoulder_l')) {
            shoulderBoneL = bone
          } else if (bname === '右腕' || bname.toLowerCase().includes('arm_r') || bname.toLowerCase().includes('upperarm_r')) {
            armBoneR = bone
          } else if (bname === '左腕' || bname.toLowerCase().includes('arm_l') || bname.toLowerCase().includes('upperarm_l')) {
            armBoneL = bone
          } else if (bname === '右ひじ' || bname.toLowerCase().includes('elbow_r') || bname.toLowerCase().includes('forearm_r')) {
            elbowBoneR = bone
          } else if (bname === '左ひじ' || bname.toLowerCase().includes('elbow_l') || bname.toLowerCase().includes('forearm_l')) {
            elbowBoneL = bone
          } else if (bname === '右手首' || bname.toLowerCase().includes('wrist_r') || bname.toLowerCase().includes('hand_r')) {
            wristBoneR = bone
          } else if (bname === '左手首' || bname.toLowerCase().includes('wrist_l') || bname.toLowerCase().includes('hand_l')) {
            wristBoneL = bone
          } else if (bname === '右足' || bname.toLowerCase().includes('thigh_r') || bname.toLowerCase().includes('leg_r')) {
            legBoneR = bone
          } else if (bname === '左足' || bname.toLowerCase().includes('thigh_l') || bname.toLowerCase().includes('leg_l')) {
            legBoneL = bone
          } else if (bname === '右ひざ' || bname.toLowerCase().includes('knee_r') || bname.toLowerCase().includes('calf_r')) {
            kneeBoneR = bone
          } else if (bname === '左ひざ' || bname.toLowerCase().includes('knee_l') || bname.toLowerCase().includes('calf_l')) {
            kneeBoneL = bone
          }
        }
      })

      toRemove.forEach((obj) => {
        if (obj.parent) obj.parent.remove(obj)
      })

      // 1. 设置模型默认朝向（魔法未来面朝正前方 Math.PI）
      model.rotation.set(0, getModelDefaultRotationY(), 0)
      model.updateMatrixWorld(true)

      // 2. 依据旋转后朝向归一化缩放与中心对齐
      const initialBox = new THREE.Box3().setFromObject(model)
      const initialSize = new THREE.Vector3()
      initialBox.getSize(initialSize)

      // 精确适配初音未来高度为 1.42m，位于舞台与半身讲解黄金视野中轴线
      const targetHeight = 1.42
      const scaleFactor = targetHeight / Math.max(initialSize.y, 0.001)
      model.scale.setScalar(scaleFactor)
      model.updateMatrixWorld(true)

      // 3. 最终精准脚踏地台表面居中
      const finalBox = new THREE.Box3().setFromObject(model)
      const center = new THREE.Vector3()
      finalBox.getCenter(center)

      model.position.x = -center.x
      model.position.z = -center.z
      model.position.y = -finalBox.min.y // 脚底精准踏立在全息底座表面 (y = 0)
      baseModelY = model.position.y

      if (scene) scene.add(model)

      // Initialize animation mixer with embedded animations
      mixer = new THREE.AnimationMixer(model)
      gltf.animations.forEach((clip) => {
        // Strip any tracks targeting platform or weapon
        clip.tracks = clip.tracks.filter((t) => {
          const tname = t.name.toLowerCase()
          return !tname.includes('platform') && !tname.includes('weapon')
        })

        if (mixer) {
          const action = mixer.clipAction(clip)
          actions[clip.name] = action
        }
      })

      // When a non-idle action finishes, smoothly return to Idle and restore upright posture
      mixer.addEventListener('finished', (e: any) => {
        const idleClipName = resolveActionName(props.modelType, 'Idle')
        if (e.action !== actions[idleClipName]) {
          if (currentModelGroup) {
            currentModelGroup.rotation.set(0, getModelDefaultRotationY(), 0)
          }
          playAnimation('Idle', true)
          emit('actionFinished')
        }
      })

      loadProgress.value = 100
      isLoading.value = false

      // Play initial animation
      playAnimation(props.animation || 'Idle', true)
      emit('loaded')
    },
    (xhr) => {
      if (xhr.total > 0) {
        loadProgress.value = 20 + Math.floor((xhr.loaded / xhr.total) * 65)
      }
    },
    (error) => {
      console.error('Failed to load Miku model:', error)
      isLoading.value = false
      emit('loaded')
    },
  )
}

function playAnimation(name: AnimationType, force = false) {
  currentProceduralAction = name
  proceduralActionTimer = 0

  // 保证基准朝向始终正确，绝不背对镜头！
  if (currentModelGroup) {
    currentModelGroup.rotation.set(0, getModelDefaultRotationY(), 0)
  }

  const isLooping = name === 'Idle' || name === 'Walk' || name === 'Rumba'

  // 针对魔法未来高精模型：定时自动恢复待机并触发动作完成回调
  if (props.modelType === 'magical') {
    if (!isLooping) {
      setTimeout(() => {
        if (currentProceduralAction === name) {
          currentProceduralAction = 'Idle'
          emit('actionFinished')
        }
      }, 3500)
    }
    return
  }

  if (!mixer) return

  const clipName = resolveActionName(props.modelType, name)
  let targetAction = actions[clipName]
  if (!targetAction) {
    const idleName = resolveActionName(props.modelType, 'Idle')
    targetAction = actions[idleName] || Object.values(actions)[0]
  }
  if (!targetAction) return

  if (currentAction === targetAction && !force) {
    targetAction.reset().play()
    return
  }

  if (currentAction) {
    currentAction.fadeOut(0.35)
  }

  targetAction.setLoop(isLooping ? THREE.LoopRepeat : THREE.LoopOnce, isLooping ? Infinity : 1)
  targetAction.clampWhenFinished = !isLooping

  targetAction.reset().fadeIn(0.35).play()
  currentAction = targetAction
}

function updateMorphTargets() {
  const { visemes, emotion } = props
  const emotionTargets = EMOTION_MORPHS[emotion] || EMOTION_MORPHS.default

  // Natural blink simulation
  const now = performance.now()
  if (now > nextBlinkTime && !isBlinking) {
    isBlinking = true
    blinkProgress = 0
  }

  let blinkVal = 0
  if (isBlinking) {
    blinkProgress += 0.16
    blinkVal = Math.sin(blinkProgress * Math.PI)
    if (blinkProgress >= 1.0) {
      isBlinking = false
      blinkVal = 0
      nextBlinkTime = now + 2400 + Math.random() * 3000
    }
  }

  for (const mesh of skinnedMeshes) {
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) continue

    const dict = mesh.morphTargetDictionary
    const influences = mesh.morphTargetInfluences

    const applyTarget = (targetName: string, targetValue: number, speed = 0.22) => {
      const idx = dict[targetName]
      if (idx !== undefined && influences[idx] !== undefined) {
        influences[idx] = THREE.MathUtils.lerp(influences[idx], targetValue, speed)
      }
    }

    // Visemes & Speech mouth shapes
    applyTarget('viseme_aa', visemes.viseme_aa)
    applyTarget('viseme_O', visemes.viseme_O)
    applyTarget('viseme_I', visemes.viseme_I)
    applyTarget('jawOpen', Math.max(visemes.jawOpen, emotionTargets.jawOpen || 0))
    applyTarget('mouthOpen', visemes.jawOpen * 0.8)

    // Eye blinking
    applyTarget('blinkEye', blinkVal, 0.6)
    applyTarget('eyeBlinkLeft', blinkVal, 0.6)
    applyTarget('eyeBlinkRight', blinkVal, 0.6)
  }
}

function updateCameraView(mode: CameraViewMode) {
  if (!camera || !controls) return

  // Camera framing coordinates: Miku positioned comfortably above subtitle overlay
  let targetPos = { x: 0, y: 0.98, z: 2.65 }
  let targetLookAt = { x: 0, y: 0.78, z: 0 }

  if (mode === 'wide') {
    // Wide full stage: Pedestal + full body + twin-tails clearly framed
    targetPos = { x: 0, y: 0.95, z: 3.6 }
    targetLookAt = { x: 0, y: 0.65, z: 0 }
  } else if (mode === 'medium') {
    // Medium half-body: Thighs/waist up to head, gestures clearly visible
    targetPos = { x: 0, y: 0.98, z: 2.65 }
    targetLookAt = { x: 0, y: 0.78, z: 0 }
  } else if (mode === 'closeup') {
    // Closeup: Face, eyes, headphones, ribbons
    targetPos = { x: 0, y: 1.08, z: 1.75 }
    targetLookAt = { x: 0, y: 0.95, z: 0 }
  }

  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.2,
    ease: 'power3.inOut',
  })

  gsap.to(controls.target, {
    x: targetLookAt.x,
    y: targetLookAt.y,
    z: targetLookAt.z,
    duration: 1.2,
    ease: 'power3.inOut',
    onUpdate: () => controls?.update(),
  })
}

function onMouseMove(e: MouseEvent) {
  const nx = (e.clientX / window.innerWidth) * 2 - 1
  const ny = -(e.clientY / window.innerHeight) * 2 + 1
  targetMouseX = nx * 0.35
  targetMouseY = ny * 0.2
}

function onWindowResize() {
  if (!containerRef.value || !renderer || !camera) return
  const width = containerRef.value.clientWidth || window.innerWidth
  const height = containerRef.value.clientHeight || window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}


function damp(current: number, target: number, speed: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * Math.min(dt, 0.1)))
}

// MMD解剖学人体肘部铰链旋转轴（Tda式模型局部坐标系下的解剖铰链向量：右臂 (0.609, 0.793, 0)，左臂 (-0.609, 0.793, 0)）
const axisElbowR = new THREE.Vector3(0.609, 0.793, 0).normalize()
const axisElbowL = new THREE.Vector3(-0.609, 0.793, 0).normalize()

function getElbowEuler(angleRad: number, isLeft = false): { x: number; y: number; z: number } {
  const axis = isLeft ? axisElbowL : axisElbowR
  const sign = isLeft ? -1 : 1
  const q = new THREE.Quaternion().setFromAxisAngle(axis, sign * angleRad)
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return { x: e.x, y: e.y, z: e.z }
}

function animate() {
  animId = requestAnimationFrame(animate)

  const now = performance.now()
  const delta = (now - lastTime) / 1000
  lastTime = now

  // FPS Update
  frameCount++
  if (now - lastFpsTime >= 1000) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsTime))
    emit('fpsUpdate', fps)
    frameCount = 0
    lastFpsTime = now
  }

  // 1. Mixer update
  if (mixer) mixer.update(delta)

  // 2. Micro procedural breathing motion
  const breath = Math.sin(now * 0.0018) * 0.003

  // 3. Head look-at cursor
  currentMouseX = damp(currentMouseX, targetMouseX, 6.0, delta)
  currentMouseY = damp(currentMouseY, targetMouseY, 6.0, delta)
  if (headBone) {
    const lookSign = props.modelType === 'magical' ? -1 : 1
    headBone.rotation.y = currentMouseX * 0.38 * lookSign
    headBone.rotation.x = -currentMouseY * 0.22
    if (props.visemes.jawOpen > 0.05) {
      headBone.rotation.x += Math.sin(now * 0.008) * 0.02 * props.visemes.jawOpen
    }
  }

  // 3.1 经典正统高精魔法未来：温婉端庄的少女自然体态（彻底防裙摆穿模，多骨骼全息微呼吸）
  if (props.modelType === 'magical') {
    const t = now * 0.001
    const isDancing = currentProceduralAction === 'Rumba'
    proceduralActionTimer += delta

    // 全息自然微呼吸与身体微重心晃动（模拟真实人类待机微律动，彻底告别假人生硬感）
    const breathSway = Math.sin(t * 1.6) * 0.012
    const hipSway = Math.cos(t * 1.1) * 0.008

    // 默认待机姿态：手臂沿百褶裙摆外侧2~3cm黄金安全空隙自然垂放 (z = -0.50 / +0.50 彻底杜绝穿模)
    const idleElbowR = getElbowEuler(0.08, false)
    const idleElbowL = getElbowEuler(0.08, true)
    let targetArmR = { x: 0.01, y: 0, z: -0.50 + Math.sin(t * 1.6) * 0.01 }
    let targetArmL = { x: 0.01, y: 0, z: 0.50 - Math.sin(t * 1.6) * 0.01 }
    let targetElbowR = { x: idleElbowR.x, y: idleElbowR.y, z: idleElbowR.z }
    let targetElbowL = { x: idleElbowL.x, y: idleElbowL.y, z: idleElbowL.z }
    let targetWristR = { x: 0, y: 0, z: 0.02 }
    let targetWristL = { x: 0, y: 0, z: -0.02 }
    let targetShoulderR = { x: 0, y: 0, z: -0.015 + breathSway * 0.2 }
    let targetShoulderL = { x: 0, y: 0, z: 0.015 - breathSway * 0.2 }
    let targetSpine = { x: Math.sin(t * 1.8) * 0.01, y: breathSway, z: Math.cos(t * 1.8) * 0.006 }
    let targetHip = { x: 0, y: -breathSway * 0.8, z: hipSway }
    let targetLegR = { x: 0, y: 0, z: 0 }
    let targetLegL = { x: 0, y: 0, z: 0 }
    let targetKneeR = { x: 0, y: 0, z: 0 }
    let targetKneeL = { x: 0, y: 0, z: 0 }
    let bodyBounce = 0

    // 12套正统人体工学动作编排（全向防穿模校准，肘部沿解剖轴微曲向前聚拢）
    if (currentProceduralAction === 'Talking_1') {
      // 【半身讲解 / 全息演讲】：右手解剖学微曲向前讲解，左手贴裙摆外侧自然垂顺
      const wave = Math.sin(t * 3.2) * 0.06
      const erb = getElbowEuler(0.78 + wave, false)
      targetArmR = { x: 0.05, y: -0.04, z: -0.50 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetWristR = { x: 0.05, y: wave * 1.2, z: 0.05 }
      targetArmL = { x: 0, y: 0, z: 0.50 }
      targetSpine = { x: 0.02, y: -0.03 + wave * 0.2, z: 0.01 }
    } else if (currentProceduralAction === 'Talking_0') {
      // 【数据研判 / 深度思考】：右手在胸前微托作专注研判，左手垂顺，体态沉着
      const pulse = Math.sin(t * 2.0) * 0.04
      const erb = getElbowEuler(1.05 + pulse, false)
      targetArmR = { x: 0.06, y: -0.05, z: -0.50 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetWristR = { x: 0.08, y: 0.05, z: 0.05 }
      targetArmL = { x: 0, y: 0, z: 0.50 }
      targetSpine = { x: 0.02, y: 0.03, z: -0.01 }
    } else if (currentProceduralAction === 'Talking_2') {
      // 【战术致意 / 礼仪致敬】：右手端庄抚心，左手贴立防穿模，微躬致敬
      const erb = getElbowEuler(1.30, false)
      targetArmR = { x: 0.08, y: -0.06, z: -0.50 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetWristR = { x: 0.1, y: 0.05, z: 0.06 }
      targetArmL = { x: 0, y: 0, z: 0.52 }
      targetSpine = { x: 0.05, y: 0, z: 0 }
    } else if (currentProceduralAction === 'Laughing') {
      // 【亲切微笑 / 开心互动】：双手在身前温和轻提，身体伴随呼吸欢快起伏
      const bounce = Math.sin(t * 5.5) * 0.04
      const erb = getElbowEuler(0.65 + bounce, false)
      const elb = getElbowEuler(0.65 + bounce, true)
      targetArmR = { x: 0.04, y: -0.03, z: -0.48 }
      targetArmL = { x: 0.04, y: 0.03, z: 0.48 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetElbowL = { x: elb.x, y: elb.y, z: elb.z }
      bodyBounce = Math.max(0, bounce) * 0.008
    } else if (currentProceduralAction === 'Angry') {
      // 【态势警示 / 严肃立正】：双手端庄收敛于身侧，身姿挺拔端正
      const erb = getElbowEuler(0.2, false)
      const elb = getElbowEuler(0.2, true)
      targetArmR = { x: -0.02, y: 0.02, z: -0.50 }
      targetArmL = { x: -0.02, y: -0.02, z: 0.50 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetElbowL = { x: elb.x, y: elb.y, z: elb.z }
      targetSpine = { x: -0.03, y: 0, z: 0 }
    } else if (currentProceduralAction === 'StagePose') {
      // 【舞台主奏 / Live开唱】：右手优雅微举向舞台上方致意，左手自然轻扶于身侧
      const pulse = Math.sin(t * 2.5) * 0.03
      const erb = getElbowEuler(0.25, false)
      const elb = getElbowEuler(0.5, true)
      targetArmR = { x: -0.15, y: 0.08, z: 1.15 + pulse }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetWristR = { x: 0.08, y: 0, z: 0.05 }
      targetArmL = { x: 0.06, y: -0.04, z: 0.50 }
      targetElbowL = { x: elb.x, y: elb.y, z: elb.z }
      targetSpine = { x: -0.04, y: 0.05, z: -0.02 }
    } else if (currentProceduralAction === 'Rumba') {
      // 【才艺律动 / 演唱会打Call】：双臂温和随节拍轻盈交替摆动
      const beat = Math.sin(t * 3.8) * 0.18
      const erb = getElbowEuler(0.3 + Math.abs(beat) * 0.2, false)
      const elb = getElbowEuler(0.3 + Math.abs(beat) * 0.2, true)
      targetArmR = { x: beat, y: 0, z: -0.52 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetArmL = { x: -beat, y: 0, z: 0.52 }
      targetElbowL = { x: elb.x, y: elb.y, z: elb.z }
      targetSpine = { x: 0, y: beat * 0.35, z: 0 }
      bodyBounce = Math.abs(beat) * 0.006
    } else if (currentProceduralAction === 'StageCheer') {
      // 【欢呼应援 / 全场大招】：双手平稳微举致意应援
      const cheer = Math.sin(t * 4.5) * 0.06
      const erb = getElbowEuler(0.25, false)
      const elb = getElbowEuler(0.25, true)
      targetArmR = { x: -0.1, y: 0.05, z: 1.1 + cheer }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetArmL = { x: -0.1, y: -0.05, z: -1.1 - cheer }
      targetElbowL = { x: elb.x, y: elb.y, z: elb.z }
      targetSpine = { x: 0, y: cheer * 0.5, z: cheer * 0.2 }
    } else if (currentProceduralAction === 'Walk') {
      // 【全息巡台 / 漫步巡场】：双臂极其自然的轻柔小幅度漫步摆臂，外展防穿模
      const step = Math.sin(t * 3.2) * 0.2
      const erb = getElbowEuler(0.12, false)
      const elb = getElbowEuler(0.12, true)
      targetArmR = { x: step, y: 0, z: -0.50 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetArmL = { x: -step, y: 0, z: 0.50 }
      targetElbowL = { x: elb.x, y: elb.y, z: elb.z }
      targetLegR = { x: -step * 0.12, y: 0, z: 0 }
      targetLegL = { x: step * 0.12, y: 0, z: 0 }
    } else if (currentProceduralAction === 'FocusPose') {
      // 【聚焦特写 / 镜头互动】：右手食指微扬向前指引，身形温婉微侧
      const erb = getElbowEuler(0.85, false)
      targetArmR = { x: 0.06, y: -0.04, z: -0.48 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetWristR = { x: 0.08, y: 0.04, z: 0.08 }
      targetArmL = { x: 0, y: 0, z: 0.50 }
      targetSpine = { x: 0.01, y: -0.04, z: 0.02 }
    } else if (currentProceduralAction === 'Crying') {
      // 【警觉戒备 / 娇羞防御】：双手在身前安静护拢，文静楚楚
      const erb = getElbowEuler(0.7, false)
      const elb = getElbowEuler(0.7, true)
      targetArmR = { x: 0.06, y: -0.05, z: -0.48 }
      targetArmL = { x: 0.06, y: 0.05, z: 0.48 }
      targetElbowR = { x: erb.x, y: erb.y, z: erb.z }
      targetElbowL = { x: elb.x, y: elb.y, z: elb.z }
      targetSpine = { x: 0.04, y: 0, z: 0 }
    }

    // 平滑指数插值驱动全身骨骼 (增加弹簧阻尼质感，消除机械生硬感)
    const smoothSpeed = isDancing ? 8.5 : 5.8
    if (armBoneR) {
      armBoneR.rotation.x = damp(armBoneR.rotation.x, targetArmR.x, smoothSpeed, delta)
      armBoneR.rotation.y = damp(armBoneR.rotation.y, targetArmR.y, smoothSpeed, delta)
      armBoneR.rotation.z = damp(armBoneR.rotation.z, targetArmR.z, smoothSpeed, delta)
    }
    if (armBoneL) {
      armBoneL.rotation.x = damp(armBoneL.rotation.x, targetArmL.x, smoothSpeed, delta)
      armBoneL.rotation.y = damp(armBoneL.rotation.y, targetArmL.y, smoothSpeed, delta)
      armBoneL.rotation.z = damp(armBoneL.rotation.z, targetArmL.z, smoothSpeed, delta)
    }
    if (elbowBoneR) {
      elbowBoneR.rotation.x = damp(elbowBoneR.rotation.x, targetElbowR.x, smoothSpeed, delta)
      elbowBoneR.rotation.y = damp(elbowBoneR.rotation.y, targetElbowR.y, smoothSpeed, delta)
      elbowBoneR.rotation.z = damp(elbowBoneR.rotation.z, targetElbowR.z, smoothSpeed, delta)
    }
    if (elbowBoneL) {
      elbowBoneL.rotation.x = damp(elbowBoneL.rotation.x, targetElbowL.x, smoothSpeed, delta)
      elbowBoneL.rotation.y = damp(elbowBoneL.rotation.y, targetElbowL.y, smoothSpeed, delta)
      elbowBoneL.rotation.z = damp(elbowBoneL.rotation.z, targetElbowL.z, smoothSpeed, delta)
    }
    if (wristBoneR) {
      wristBoneR.rotation.x = damp(wristBoneR.rotation.x, targetWristR.x, smoothSpeed, delta)
      wristBoneR.rotation.y = damp(wristBoneR.rotation.y, targetWristR.y, smoothSpeed, delta)
      wristBoneR.rotation.z = damp(wristBoneR.rotation.z, targetWristR.z, smoothSpeed, delta)
    }
    if (wristBoneL) {
      wristBoneL.rotation.x = damp(wristBoneL.rotation.x, targetWristL.x, smoothSpeed, delta)
      wristBoneL.rotation.y = damp(wristBoneL.rotation.y, targetWristL.y, smoothSpeed, delta)
      wristBoneL.rotation.z = damp(wristBoneL.rotation.z, targetWristL.z, smoothSpeed, delta)
    }
    if (shoulderBoneR) {
      shoulderBoneR.rotation.z = damp(shoulderBoneR.rotation.z, targetShoulderR.z, smoothSpeed, delta)
    }
    if (shoulderBoneL) {
      shoulderBoneL.rotation.z = damp(shoulderBoneL.rotation.z, targetShoulderL.z, smoothSpeed, delta)
    }
    if (spineBone) {
      spineBone.rotation.x = damp(spineBone.rotation.x, targetSpine.x, smoothSpeed, delta)
      spineBone.rotation.y = damp(spineBone.rotation.y, targetSpine.y, smoothSpeed, delta)
      spineBone.rotation.z = damp(spineBone.rotation.z, targetSpine.z, smoothSpeed, delta)
    }
    if (hipBone) {
      hipBone.rotation.y = damp(hipBone.rotation.y, targetHip.y, smoothSpeed, delta)
      hipBone.rotation.z = damp(hipBone.rotation.z, targetHip.z, smoothSpeed, delta)
    }
    if (legBoneR) {
      legBoneR.rotation.x = damp(legBoneR.rotation.x, targetLegR.x, smoothSpeed, delta)
    }
    if (legBoneL) {
      legBoneL.rotation.x = damp(legBoneL.rotation.x, targetLegL.x, smoothSpeed, delta)
    }
    if (kneeBoneR) {
      kneeBoneR.rotation.x = damp(kneeBoneR.rotation.x, targetKneeR.x, smoothSpeed, delta)
    }
    if (kneeBoneL) {
      kneeBoneL.rotation.x = damp(kneeBoneL.rotation.x, targetKneeL.x, smoothSpeed, delta)
    }
    if (currentModelGroup) {
      currentModelGroup.position.y = baseModelY + breath + bodyBounce
    }
  }
  // 4. Morph targets
  updateMorphTargets()

  // 5. Rotating holographic stage rings
  if (holographicStageGroup && holographicStageGroup.children.length >= 4) {
    holographicStageGroup.children[1].rotation.z += 0.007
    holographicStageGroup.children[2].rotation.z -= 0.004
    holographicStageGroup.children[3].rotation.z -= 0.006
  }

  // 6. Breathing holo beam column opacity
  if (holoBeamMesh) {
    const beamMat = holoBeamMesh.material as THREE.MeshBasicMaterial
    if (beamMat) {
      beamMat.opacity = 0.045 + Math.sin(now * 0.002) * 0.015
    }
  }

  // 7. Particles rising
  if (particleSystem) {
    const posAttr = particleSystem.geometry.attributes.position as THREE.BufferAttribute
    const speedAttr = particleSystem.geometry.attributes.speed as THREE.BufferAttribute
    for (let i = 0; i < posAttr.count; i++) {
      let y = posAttr.getY(i)
      const spd = speedAttr.getX(i)
      y += spd
      if (y > 2.6) y = 0.04
      posAttr.setY(i, y)
    }
    posAttr.needsUpdate = true
  }

  // 8. Render
  if (controls) controls.update()
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

watch(
  () => props.animation,
  (newAnim) => playAnimation(newAnim, true),
)

watch(
  () => props.cameraView,
  (newView) => updateCameraView(newView),
)

watch(
  () => props.modelType,
  (newType) => {
    loadMikuModel(newType)
  },
)

onMounted(() => {
  initScene()
})

onBeforeUnmount(() => {
  if (animId) cancelAnimationFrame(animId)
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('mousemove', onMouseMove)

  if (renderer) {
    renderer.dispose()
    if (renderer.domElement && renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  }
  if (mixer) mixer.stopAllAction()
})
</script>

<template>
  <div ref="containerRef" class="avatar-scene-container">
    <!-- 加载骨架遮罩 -->
    <div v-if="isLoading" class="scene-loader">
      <div class="loader-core">
        <div class="loader-hex-pulse">
          <div class="hex-inner" />
        </div>
        <div class="loader-text">
          <span class="loader-title">初音未来 · 全息数智模型加载中</span>
          <span class="loader-percent">{{ loadProgress }}%</span>
        </div>
        <div class="loader-progress-bar">
          <div class="progress-fill" :style="{ width: `${loadProgress}%` }" />
        </div>
        <div class="loader-sub">Hatsune Miku 3D Avatar & Live Motion Neural Engine</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.avatar-scene-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at 50% 48%, #0a1428 0%, #040814 65%, #010307 100%);
}

.scene-loader {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 5, 12, 0.92);
  backdrop-filter: blur(16px);
}

.loader-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 380px;
  background: rgba(10, 18, 38, 0.85);
  border: 1px solid rgba(0, 242, 254, 0.35);
  border-radius: 12px;
  padding: 30px 24px;
  box-shadow: 0 0 35px rgba(0, 242, 254, 0.25);
}

.loader-hex-pulse {
  width: 58px;
  height: 58px;
  border: 3px solid rgba(0, 242, 254, 0.2);
  border-top-color: #00f2fe;
  border-bottom-color: #a855f7;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hex-inner {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #00f2fe, #a855f7);
  border-radius: 50%;
  box-shadow: 0 0 16px rgba(0, 242, 254, 0.8);
  animation: pulse 1.5s infinite;
}

.loader-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 600;
  margin-bottom: 12px;
}

.loader-percent {
  color: #00f2fe;
  font-family: monospace;
  font-weight: 800;
  font-size: 15px;
}

.loader-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00f2fe 0%, #38bdf8 50%, #a855f7 100%);
  transition: width 0.25s ease-out;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.7);
}

.loader-sub {
  font-size: 10px;
  color: #64748b;
  font-family: monospace;
  letter-spacing: 0.5px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}
</style>
