import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { Request, Response, NextFunction } from "express";

// Exponho declaração global de tipo para estender a Request do Express
declare global {
  namespace Express {
    interface Request {
      supabase?: ReturnType<typeof createServerClient>;
      user?: any;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://sfxyybvhxntsyfyiinov.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

/**
 * Cria o cliente do Supabase no lado do servidor para a requisição e resposta do Express.
 */
export function createExpressSupabaseClient(req: Request, res: Response) {
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? "").map((c) => ({
          name: c.name,
          value: c.value ?? ""
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, {
              ...options,
              path: options.path ?? "/"
            })
          );
        });
      },
    },
  });
}

/**
 * Middleware para atualizar os tokens e manter a sessão do usuário ativa e sincronizada nas requisições.
 */
export async function supabaseSessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const supabaseClient = createExpressSupabaseClient(req, res);
    
    // Anexa a instância do cliente Supabase para acesso fácil em rotas subsequentes
    req.supabase = supabaseClient;

    // Obtém o usuário ativo (isso automaticamente renova sessões prestes a expirar nas cookies)
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (user) {
      req.user = user;
    } else if (error) {
      console.debug("Sessão anônima ou token expirado:", error.message);
    }
  } catch (error: any) {
    console.error("Erro crítico no middleware de sessão do Supabase:", error.message);
  }
  
  next();
}
