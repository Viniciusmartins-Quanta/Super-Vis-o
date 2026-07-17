import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

/**
 * Comprime e envia uma foto para o Supabase Storage, retornando a URL pública.
 */
export async function uploadFotoParaStorage(file: File, pasta: string = 'geral'): Promise<string | null> {
  try {
    // Configuração para economizar o tráfego do seu Supabase (máximo 300 KB e resolução Full HD)
    const opcoesCompressao = {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    const arquivoComprimido = await imageCompression(file, opcoesCompressao);
    
    // Gera um nome único e seguro para o arquivo
    const pastaSegura = pasta
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Troca espaços e símbolos por traço
      .toLowerCase();

    const fileExt = arquivoComprimido.name.split('.').pop() || 'jpg';
    const fileName = `${pastaSegura}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    // Envia o arquivo leve para o bucket 'fotos-obras' no Supabase
    const { error: uploadError } = await supabase.storage
      .from('fotos-obras')
      .upload(fileName, arquivoComprimido, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro no envio ao Supabase Storage:', uploadError.message);
      alert('Erro ao enviar foto. Verifique sua conexão ou permissões.');
      return null;
    }

    // Retorna apenas o link curto da foto
    const { data: urlData } = supabase.storage
      .from('fotos-obras')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro inesperado na compressão ou upload:', error);
    return null;
  }
}