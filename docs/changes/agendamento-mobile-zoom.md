# Agendamento no celular: foco e teclado — 06/11/2026

Correção compartilhada nas visões admin, profissional e cliente. CSS de telas estreitas/dispositivos de toque garante fonte de 16px nos campos editáveis e seletores, inclusive sobre as regras de 14px da edição de agendamento. Preserva o viewport escalável: não acrescenta user-scalable=no ou maximum-scale=1, nem usa transform/zoom para encolher campos.

Observador de VisualViewport acompanha altura e deslocamento quando o teclado abre/fecha. Sheets de agendamento e conclusão usam a altura visível e o espaço inferior coberto pelo teclado, com corpo rolável e ações fora da rolagem. Eventos durante pinch zoom não recalculam o enquadramento; fallback CSS com dvh para navegadores sem a API. Listeners e requestAnimationFrame são removidos no cleanup. Telefone da confirmação da cliente usa teclado tel e preenchimento automático apropriado.

46 testes frontend aprovados, incluindo abertura/deslocamento/fechamento do teclado, pinch zoom, Android com layout viewport redimensionado e ausência de VisualViewport. Build e TypeScript aprovados. Não houve validação em iPhone físico; a tentativa de abrir navegador de teste via CUA retornou erro interno timeoutMs antes da abertura. Não atribuir emulação automatizada a Safari real. Nenhuma mudança de backend ou banco.
