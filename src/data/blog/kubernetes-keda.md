---
title: Kubernetes vs Keda
author: Claudio Masolo
pubDatetime: 2026-04-20T11:00:47Z
slug: 
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - Kubernetes
description: Kubernetes 1.36 vs Keda
---

Kubernetes 1.36 lands on April 22, and one of the headline features is something the community has been asking for since Kubernetes 1.16: the `HPAScaleToZero` feature gate, now in beta. The Horizontal Pod Autoscaler can finally scale a deployment down to zero replicas, and back up, without any third-party tooling.

Within hours of the release notes circulating, LinkedIn filled up with  "KEDA is finished." The problem here is a category error. [HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) and [KEDA](https://keda.sh/) don't scale workloads for the same reason. They react to entirely different signals:

- **Kubernetes HPA (Horizontal Pod Autoscaler):**  The Core Focus is resource-based scaling (CPU and memory). Now, in the version 1.36, the HPA supports scaling down to zero replicas when resource utilization hits zero, and scaling back up when demand increases. 

- **KEDA (Kubernetes Event-driven Autoscaling)**: The core focus here is the Event-driven scaling. KEDA scales the PODs based on external metrics rather than resource consumption. Examples include queue depth, Kafka consumer lag, Cron schedules, or database row counts. This approach is ideal for workloads where CPU/memory metrics are poor indicators of demand, such as background job processors or message consumers.

Think about a batch job that processes messages from an SQS queue. When the queue is empty, you want zero pods. When messages arrive, you want pods: fast, proportional to how many messages are waiting. CPU utilization on those pods tells you almost nothing useful about this. The queue depth is the signal. That's what KEDA reads.

Now think about a stateless API service. You want it scaled down at 3am when there's no traffic, and scaled back up when requests start coming in. CPU and memory are perfectly reasonable proxies here. HPA handles this well, and now, after years of waiting, it can go all the way to zero without you having to wire up KEDA or Knative just to get that last step.

These are different workloads with different operational profiles. The new HPA feature is genuinely useful. It closes a real gap for resource-based scaling, and it means one less reason to reach for an external tool if your scaling logic is purely CPU or memory driven.

But if you're running event-driven consumers like: Kafka, RabbitMQ, SQS, or any of the 60+ scalers KEDA supports, you're not going to replace it with HPA. You'd be throwing away the exact thing that makes your scaling logic correct and replacing it with a metric that doesn't describe your problem.

KEDA's website describes it exactly right: it's an event-driven autoscaler. The whole value proposition is that your scaling decisions live in the same conceptual space as your workload's actual behavior. A message consumer scales on message count. A scheduled job scales on a cron expression. A database processor scales on queue table depth. That's not something a CPU metric can replace, because CPU is not the right metrics to decided when scale in these use cases.

The honest summary: Kubernetes 1.36 is great news if you've been manually hacking around the HPA floor of 1. For anything event-driven, KEDA was already the right tool, and it still is. One more native feature doesn't change what problem it was solving.


