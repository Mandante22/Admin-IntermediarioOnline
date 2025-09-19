document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://liywjnjmbzqlepdzarag.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeXdqbmptYnpxbGVwZHphcmFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODE1MTUzMiwiZXhwIjoyMDczNzI3NTMyfQ.JOMzpT2aog0rG0pHCJwvfl-pFTF60q3kgLOOijkYOBc';

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // =============== CARREGAR ESTATÍSTICAS ===============
    async function carregarEstatisticas() {
        try {
            const { data, error } = await supabaseClient.from('anuncios').select('*');
            if (error) {
                console.error("Erro ao carregar estatísticas:", error.message || JSON.stringify(error));
                return;
            }

            const total = data.length;
            const ativos = data.filter(a => a.status === 'ativo').length;
            const pendentes = data.filter(a => a.status === 'pendente').length;

            document.getElementById('totalAnuncios').textContent = total;
            document.getElementById('anunciosAtivos').textContent = ativos;
            document.getElementById('anunciosPendentes').textContent = pendentes;
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error.message || JSON.stringify(error));
        }
    }

    // =============== CARREGAR GRAFICOS ===============
    async function carregarGraficos() {
        try {
            const { data: anuncios, error } = await supabaseClient
                .from('anuncios')
                .select('*')
                .order('dataCriacao', { ascending: false });

            if (error) throw error;

            // Gráfico de anúncios por dia
            const dias = [];
            const quantidades = [];

            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const formattedDate = date.toLocaleDateString('pt-AO');
                dias.push(formattedDate);

                const count = anuncios.filter(a => {
                    const aDate = new Date(a.dataCriacao);
                    return aDate.toDateString() === date.toDateString();
                }).length;
                quantidades.push(count);
            }

            const ctx1 = document.getElementById('graficoPorDia').getContext('2d');
            new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: dias,
                    datasets: [{
                        label: 'Anúncios por Dia',
                        data: quantidades,
                        backgroundColor: '#dc3545',
                        borderColor: '#dc3545',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            // Gráfico de anúncios por localização
            const localizacoes = {};
            anuncios.forEach(a => {
                if (!localizacoes[a.localizacao]) {
                    localizacoes[a.localizacao] = 0;
                }
                localizacoes[a.localizacao]++;
            });

            const labelsLoc = Object.keys(localizacoes);
            const valuesLoc = Object.values(localizacoes);

            const ctx2 = document.getElementById('graficoPorBairro').getContext('2d');
            new Chart(ctx2, {
                type: 'pie',
                data: {
                    labels: labelsLoc,
                    datasets: [{
                        data: valuesLoc,
                        backgroundColor: [
                            '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f43'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true
                }
            });

        } catch (error) {
            console.error("Erro ao carregar gráficos:", error);
        }
    }

    // =============== CARREGAR ANÚNCIOS PENDENTES ===============
    async function carregarAnunciosAguardando() {
        try {
            const { data, error } = await supabaseClient
                .from('anuncios')
                .select('*')
                .eq('status', 'pendente')
                .order('dataCriacao', { ascending: false });

            if (error) {
                console.error("Erro ao carregar anúncios:", error.message || JSON.stringify(error));
                document.getElementById('mensagemErro').classList.remove('d-none');
                return;
            }

            let html = '';
            if (data.length === 0) {
                html = `<p class="text-center text-success">✅ Todos os anúncios foram revisados. Nenhum anúncio pendente.</p>`;
            } else {
                data.forEach(anuncio => {
                    html += `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col-md-2">
                                        <img src="${anuncio.fotoPrincipal || 'https://via.placeholder.com/100x100?text=Sem+Foto'}" alt="Foto do imóvel" class="img-fluid rounded">
                                    </div>
                                    <div class="col-md-6">
                                        <h5 class="card-title">${anuncio.titulo}</h5>
                                        <p class="card-text mb-1"><strong>Localização:</strong> ${anuncio.localizacao}</p>
                                        <p class="card-text mb-1"><strong>Preço:</strong> ${anuncio.preco.toLocaleString('pt-AO')} Kz</p>
                                        <p class="card-text mb-1"><strong>Contacto:</strong> ${anuncio.contacto}</p>
                                        <p class="card-text mb-1"><strong>Data:</strong> ${new Date(anuncio.dataCriacao).toLocaleDateString()}</p>
                                    </div>
                                    <div class="col-md-4 d-flex flex-column gap-2">
                                        <a href="${anuncio.comprovante}" target="_blank" class="btn btn-secondary w-100">Ver Comprovante</a>
                                        <button class="btn btn-success w-100" onclick="aprovarAnuncio('${anuncio.id}')">✅ Aprovar</button>
                                        <button class="btn btn-danger w-100" onclick="rejeitarAnuncio('${anuncio.id}')">❌ Rejeitar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            document.getElementById('listaAnunciosAdmin').innerHTML = html;

            // Filtro de busca
            document.getElementById('filtroBusca').addEventListener('input', function(e) {
                const termo = e.target.value.toLowerCase();
                const cards = document.querySelectorAll('#listaAnunciosAdmin .card');
                cards.forEach(card => {
                    const texto = card.textContent.toLowerCase();
                    card.style.display = texto.includes(termo) ? 'block' : 'none';
                });
            });

            // Exportar CSV
            document.getElementById('btnExportarCSV').addEventListener('click', function() {
                const { data } = supabaseClient.from('anuncios').select('*');
                const csv = convertToCSV(data);
                downloadCSV(csv, 'anuncios_intermediario_online.csv');
            });

            // Recarregar
            document.getElementById('btnRecarregar').addEventListener('click', function() {
                location.reload();
            });

        } catch (error) {
            console.error("Erro ao carregar anúncios:", error.message || JSON.stringify(error));
            document.getElementById('mensagemErro').classList.remove('d-none');
        }
    }

    // =============== AÇÕES DE GESTÃO ===============
    window.aprovarAnuncio = async function(id) {
        if (!confirm('Tem certeza que deseja aprovar este anúncio?')) return;
        try {
            await supabaseClient.from('anuncios').update({ status: 'ativo' }).eq('id', id);
            alert('Anúncio aprovado com sucesso!');
            location.reload();
        } catch (error) {
            console.error("Erro ao aprovar:", error.message || JSON.stringify(error));
            alert("Erro ao aprovar anúncio.");
        }
    };

    window.rejeitarAnuncio = async function(id) {
        if (!confirm('Tem certeza que deseja rejeitar este anúncio?')) return;
        try {
            await supabaseClient.from('anuncios').update({ status: 'rejeitado' }).eq('id', id);
            alert('Anúncio rejeitado.');
            location.reload();
        } catch (error) {
            console.error("Erro ao rejeitar:", error.message || JSON.stringify(error));
            alert("Erro ao rejeitar anúncio.");
        }
    };

    // Funções auxiliares
    function convertToCSV(objArray) {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = 'ID,Título,Descrição,Localização,Preço,Contacto,Status,Data Criação\n';
        for (let i = 0; i < array.length; i++) {
            let line = '';
            line += array[i].id + ',';
            line += `"${array[i].titulo.replace(/"/g, '""')}",`;
            line += `"${array[i].descricao.replace(/"/g, '""')}",`;
            line += `"${array[i].localizacao.replace(/"/g, '""')}",`;
            line += array[i].preco + ',';
            line += array[i].contacto + ',';
            line += array[i].status + ',';
            line += (array[i].dataCriacao ? new Date(array[i].dataCriacao).toLocaleDateString() : '') + '\n';
            str += line;
        }
        return str;
    }

    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Função para carregar tudo (chamada após login)
    window.carregarTudo = function() {
        carregarEstatisticas();
        carregarAnunciosAguardando();
        carregarGraficos();
    };
});