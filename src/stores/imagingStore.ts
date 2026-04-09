import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import { ImagingItem } from './scenariosStore';

interface ImagingState {
  myImages: ImagingItem[];
  libraryImages: ImagingItem[];
  isLoading: boolean;
  fetchMyImages: () => Promise<void>;
  fetchLibraryImages: () => Promise<void>;
  uploadImage: (file: File, category: string, type: string) => Promise<ImagingItem | null>;
  uploadLibraryImage: (file: File, categoryPath: string[]) => Promise<ImagingItem | null>;
  deleteImage: (id: string, path: string) => Promise<void>;
  deleteLibraryImage: (fileName: string) => Promise<void>;
  
  pinnedImages: ImagingItem[];
  pinImage: (img: ImagingItem) => void;
  unpinImage: (id: string) => void;
}
export const useImagingStore = create<ImagingState>()(
  persist(
    (set, get) => ({
      myImages: [],
      libraryImages: [],
      pinnedImages: [],
      isLoading: false,

  fetchLibraryImages: async () => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from('sim_images').list('library');
      if (error) {
         console.error("Error fetching library images", error);
         return;
      }
      
      const images: ImagingItem[] = data.map((file: any) => {
          const { data: { publicUrl } } = supabase.storage.from('sim_images').getPublicUrl(`library/${file.name}`);
          
          // Decode category path: CAT1__CAT2__originalName.ext
          const parts = file.name.split('__');
          let category = 'Library';
          let originalName = file.name;
          
          if (parts.length > 1) {
              originalName = parts.pop() || file.name;
              category = parts.join(' / ');
          }

          return {
              id: file.id || file.name,
              url: publicUrl,
              name: originalName,
              type: 'UNKNOWN',
              category: category,
              isCustom: false,
              rawName: file.name // Keep raw name for deletion/matching
          };
      });

      set({ libraryImages: images.filter(img => img.name !== '.emptyFolderPlaceholder') });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

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

  uploadLibraryImage: async (file: File, categoryPath: string[]) => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const prefix = categoryPath.length > 0 ? categoryPath.join('__') + '__' : '';
      const safeFileName = file.name.replace(/__/g, '_'); // prevent double underscores in filename
      const fileName = `${prefix}${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `library/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('sim_images').upload(filePath, file);
      if (uploadError) throw uploadError;

      await get().fetchLibraryImages();
      
      const { data: { publicUrl } } = supabase.storage.from('sim_images').getPublicUrl(filePath);

      return {
          id: fileName,
          url: publicUrl,
          name: safeFileName,
          type: 'IMAGE',
          category: categoryPath.join(' / '),
          isCustom: false,
          rawName: fileName
      };
    } catch (e) {
      console.error("Upload library failed", e);
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
  },
  
  deleteLibraryImage: async (fileName: string) => {
      set({ isLoading: true });
      try {
          const supabase = createClient();
          await supabase.storage.from('sim_images').remove([`library/${fileName}`]);
          await get().fetchLibraryImages();
      } catch (e) {
          console.error(e);
      } finally {
          set({ isLoading: false });
      }
  },
  
  pinImage: (img) => {
      set(state => {
          if (state.pinnedImages.some(p => p.id === img.id)) return state;
          return { pinnedImages: [...state.pinnedImages, img] };
      });
  },
  
  unpinImage: (id) => {
      set(state => ({
          pinnedImages: state.pinnedImages.filter(p => p.id !== id)
      }));
  }
}),
{
  name: 'pedisim-imaging-storage',
  partialize: (state) => ({ pinnedImages: state.pinnedImages }), // only persist pinnedImages
}
));
