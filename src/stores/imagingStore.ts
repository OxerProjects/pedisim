import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { ImagingItem } from './scenariosStore';

interface ImagingState {
  myImages: ImagingItem[];
  libraryImages: ImagingItem[];
  isLoading: boolean;
  fetchMyImages: () => Promise<void>;
  uploadImage: (file: File, category: string, type: string) => Promise<ImagingItem | null>;
  deleteImage: (id: string, path: string) => Promise<void>;
}

// We will mock library images for now. Real implementations can fetch from a generic public bucket.
const mockLibrary: ImagingItem[] = [
  { id: 'lib_1', url: '/mocks/ecg_normal.jpg', name: 'Normal Sinus Rhythm', type: 'ECG', category: 'ECG' },
  { id: 'lib_2', url: '/mocks/xray_chest.jpg', name: 'Clear Chest', type: 'XRAY', category: 'חזה' },
];

export const useImagingStore = create<ImagingState>((set, get) => ({
  myImages: [],
  libraryImages: mockLibrary,
  isLoading: false,

  fetchMyImages: async () => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.storage.from('sim_images').list(user.id);
      if (error) {
         console.error("Error fetching images", error);
         return;
      }

      const images: ImagingItem[] = data.map((file: any) => {
          const { data: { publicUrl } } = supabase.storage.from('sim_images').getPublicUrl(`${user.id}/${file.name}`);
          // parse name for meta if needed, but for now just raw
          return {
              id: file.id || file.name,
              url: publicUrl,
              name: file.name,
              type: 'UNKNOWN', // Will be determined by metadata or extension in real app
              category: 'My Uploads',
              isCustom: true
          };
      });

      // Filter out empty dir placeholders
      set({ myImages: images.filter(img => img.name !== '.emptyFolderPlaceholder') });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  uploadImage: async (file: File, category: string, type: string) => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('sim_images').upload(filePath, file);

      if (uploadError) throw uploadError;

      // refresh
      await get().fetchMyImages();
      
      const { data: { publicUrl } } = supabase.storage.from('sim_images').getPublicUrl(filePath);

      return {
          id: fileName,
          url: publicUrl,
          name: file.name,
          type,
          category,
          isCustom: true
      };
    } catch (e) {
      console.error("Upload failed", e);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteImage: async (id: string, path: string) => {
      set({ isLoading: true });
      try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.storage.from('sim_images').remove([`${user.id}/${path}`]);
          await get().fetchMyImages();
      } catch (e) {
          console.error(e);
      } finally {
          set({ isLoading: false });
      }
  }
}));
