## Escalabilidade

A versão atual é uma aplicação acadêmica pensada para **uma cantina**, sem testes de carga em grande escala. O documento [docs/ESCALABILIDADE.md](docs/ESCALABILIDADE.md) apresenta uma **proposta conceitual** de evolução para atender **1 milhão de usuários e 100 mil simultâneos** em todo o Brasil. Ela cobre load balancer, escalabilidade horizontal, réplicas de leitura, pool de conexões, particionamento, Redis, filas (RabbitMQ/Kafka), CDN, monitoramento e Kubernetes.
