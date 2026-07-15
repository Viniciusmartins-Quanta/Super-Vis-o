import { supabase } from '../supabase';

/**
 * Envia uma foto para o Supabase Storage e retorna a URL pública do arquivo.
 * @param file O arquivo bruto vindo do input (<input type="file" />)
 * @param pasta O subdiretório para organização (ex: 'timeline' ou 'semanais')
 */
export async function uploadFotoParaStorage(file: File, pasta: string = 'geral'): Promise<string | null> {
  try {
    // 1. Gera um nome único para o arquivo usando o timestamp e o nome original sem espaços
    const fileExt = file.name.split('.').pop();
    const fileName = `${pasta}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    // 2. Envia o arquivo físico para o bucket 'fotos-obras'
    const { error: uploadError, data } = await supabase.storage
      .from('fotos-obras')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro no envio ao Supabase Storage:', uploadError.message);
      alert('Erro ao enviar foto. Verifique sua conexão ou permissões.');
      return null;
    }

    // 3. Pega a URL pública que o Supabase gerou para essa foto
    const { data: urlData } = supabase.storage
      .from('fotos-obras')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro inesperado no upload:', error);
    return null;
  }
}
// forçando o salvamento