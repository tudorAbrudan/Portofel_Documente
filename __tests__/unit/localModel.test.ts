/**
 * Unit tests pentru localModel — catalog și compatibilitate device.
 */

import {
  LOCAL_MODEL_CATALOG,
  LocalModelEntry,
  getIphoneGeneration,
  isModelCompatible,
  getCompatibleModels,
} from '@/services/localModel';

describe('LOCAL_MODEL_CATALOG', () => {
  it('conține exact 2 modele', () => {
    expect(LOCAL_MODEL_CATALOG).toHaveLength(2);
  });

  it('fiecare model are id unic', () => {
    const ids = LOCAL_MODEL_CATALOG.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fiecare model are câmpurile obligatorii completate', () => {
    for (const model of LOCAL_MODEL_CATALOG) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.description).toBeTruthy();
      expect(model.sizeBytes).toBeGreaterThan(0);
      expect(model.sizeLabel).toBeTruthy();
      expect(model.minRamBytes).toBeGreaterThan(0);
      expect(model.minIphoneGen).toBeGreaterThan(0);
      expect(model.qualityStars).toBeGreaterThanOrEqual(1);
      expect(model.qualityStars).toBeLessThanOrEqual(5);
      expect(model.downloadUrl).toMatch(/^https:\/\//);
    }
  });

  it('URL-urile sunt de pe HuggingFace', () => {
    for (const model of LOCAL_MODEL_CATALOG) {
      expect(model.downloadUrl).toContain('huggingface.co');
    }
  });
});

describe('getIphoneGeneration', () => {
  it('extrage numărul din "iPhone 14 Pro"', () => {
    expect(getIphoneGeneration('iPhone 14 Pro')).toBe(14);
  });

  it('extrage numărul din "iPhone 12"', () => {
    expect(getIphoneGeneration('iPhone 12')).toBe(12);
  });

  it('extrage numărul din "iPhone 15 Pro Max"', () => {
    expect(getIphoneGeneration('iPhone 15 Pro Max')).toBe(15);
  });

  it('returnează 0 pentru null', () => {
    expect(getIphoneGeneration(null)).toBe(0);
  });

  it('returnează 0 pentru string non-iPhone', () => {
    expect(getIphoneGeneration('iPad Pro')).toBe(0);
  });
});

describe('isModelCompatible', () => {
  // ministral-3b: minRam=5GiB, minGen=14
  const modelMinistral: LocalModelEntry = { ...LOCAL_MODEL_CATALOG[0] };
  // mistral-7b: minRam=7GiB, minGen=15
  const modelMistral7b: LocalModelEntry = { ...LOCAL_MODEL_CATALOG[1] };

  // Real device values: iOS NSProcessInfo.physicalMemory reports less than marketed RAM
  const RAM_IPHONE14PRO = 5905580032; // iPhone 14 Pro (marketed 6GB) — real reported value
  const RAM_IPHONE15PRO = 8053063680; // iPhone 15 Pro (marketed 8GB) — real reported value
  const RAM_6GIB = 6 * 1024 * 1024 * 1024; // idealized binary value

  it('compatibil: ministral-3b pe iPhone 14 Pro (valoare RAM reală)', () => {
    expect(isModelCompatible(modelMinistral, RAM_IPHONE14PRO, 14)).toBe(true);
  });

  it('compatibil: ministral-3b pe iPhone 14 cu RAM idealizat 6GiB', () => {
    expect(isModelCompatible(modelMinistral, RAM_6GIB, 14)).toBe(true);
  });

  it('incompatibil: ministral-3b pe telefon cu 4GB RAM', () => {
    expect(isModelCompatible(modelMinistral, 4 * 1024 * 1024 * 1024, 14)).toBe(false);
  });

  it('incompatibil: generație prea mică (iPhone 13 < 14)', () => {
    expect(isModelCompatible(modelMinistral, RAM_IPHONE14PRO, 13)).toBe(false);
  });

  it('compatibil: mistral-7b pe iPhone 15 Pro (valoare RAM reală)', () => {
    expect(isModelCompatible(modelMistral7b, RAM_IPHONE15PRO, 15)).toBe(true);
  });

  it('incompatibil: mistral-7b pe iPhone 15 standard (6GB RAM)', () => {
    expect(isModelCompatible(modelMistral7b, RAM_IPHONE14PRO, 15)).toBe(false);
  });

  it('compatibil cu RAM null → true (emulator/dev)', () => {
    expect(isModelCompatible(modelMinistral, null, 14)).toBe(true);
  });
});

describe('getCompatibleModels', () => {
  // Mock in setup.ts sets: totalMemory=5905580032 (iPhone 14 Pro real value), modelName='iPhone 14 Pro'
  it('returnează doar modele compatibile cu iPhone 14 Pro', () => {
    const compatible = getCompatibleModels();
    for (const model of compatible) {
      expect(model.minRamBytes).toBeLessThanOrEqual(5905580032);
      expect(model.minIphoneGen).toBeLessThanOrEqual(14);
    }
  });

  it('exclude mistral-7b (necesită 8GB RAM)', () => {
    const compatible = getCompatibleModels();
    expect(compatible.find(m => m.id === 'mistral-7b')).toBeUndefined();
  });

  it('include ministral-3b', () => {
    const compatible = getCompatibleModels();
    expect(compatible.find(m => m.id === 'ministral-3b')).toBeDefined();
  });
});

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage mock has __esModule: true so the default import gives the mock object directly.
const AsyncStorageMock = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

describe('isModelDownloaded', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returnează false când fișierul nu există', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    const { isModelDownloaded } = require('@/services/localModel');
    expect(await isModelDownloaded('llama3-3b')).toBe(false);
  });

  it('returnează true când fișierul există', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false });
    const { isModelDownloaded } = require('@/services/localModel');
    expect(await isModelDownloaded('llama3-3b')).toBe(true);
  });
});

describe('getSelectedModelId / setSelectedModelId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returnează null când nu e setat nimic', async () => {
    AsyncStorageMock.getItem.mockResolvedValue(null);
    const { getSelectedModelId } = require('@/services/localModel');
    expect(await getSelectedModelId()).toBeNull();
  });

  it('returnează id-ul salvat', async () => {
    AsyncStorageMock.getItem.mockResolvedValue('qwen25-3b');
    const { getSelectedModelId } = require('@/services/localModel');
    expect(await getSelectedModelId()).toBe('qwen25-3b');
  });

  it('salvează id-ul în AsyncStorage', async () => {
    const { setSelectedModelId } = require('@/services/localModel');
    await setSelectedModelId('llama3-3b');
    expect(AsyncStorageMock.setItem).toHaveBeenCalledWith('local_model_selected', 'llama3-3b');
  });
});
