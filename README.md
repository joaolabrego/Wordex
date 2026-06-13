Wordex — Templates HTML, JSON e PDF

O Wordex é uma ferramenta para criação interativa de documentos e relatórios baseados em HTML.

Com ele, é possível criar contratos, cartas, documentos, relatórios, etiquetas, crachás e diversos outros modelos diretamente em HTML.

Os templates podem ser utilizados de duas formas:

Estática: sem qualquer fonte de dados, funcionando como um documento HTML comum.

Dinâmica: alimentada por arquivos JSON, preenchendo automaticamente tags como:
{{Nome}}
{{Endereco}}
{{Valor}}
{{Data}}

O Wordex acompanha uma planilha Excel para geração de arquivos JSON personalizados, permitindo que usuários e analistas criem suas próprias fontes de dados sem necessidade de programação.

Geração de PDF

Após a montagem do documento, o Wordex pode convertê-lo para PDF preservando o layout visual do template.

Modos de utilização

Standalone

O Wordex pode ser utilizado como aplicação independente em um único arquivo HTML.
Nesse modo, o usuário cria templates, carrega dados, monta documentos e gera PDFs sem depender de qualquer sistema externo.

Frontend

O Wordex pode ser embarcado em aplicações web através de iframe.
Nesse cenário, o sistema hospedeiro fornece os dados e o Wordex fica responsável pela montagem do documento e geração do PDF.

Backend

O Wordex pode ser executado em serviços, APIs ou processos de backend utilizando Chrome Headless para geração automática de documentos e PDFs.

Templates autossuficientes

Ao salvar um template, o Wordex pode incorporar em um único arquivo tudo o que é necessário para sua execução.
Isso significa que o próprio template pode carregar consigo o motor do Wordex, tornando-se um arquivo autossuficiente e portátil.
O usuário pode distribuir, copiar e executar o template sem necessidade de instalação de componentes adicionais.

Resumo

HTML define o documento.
JSON (opcional) fornece os dados.
O Wordex monta o resultado final.
O Wordex gera o PDF.
O template pode carregar consigo o próprio Wordex.
