---
layout: post
title: "Continuous Integration,delivery,deploy"
categories: DevOps
tags: [DevOps]
image:
  feature: seaside-06.jpg
  teaser: seaside-06.jpg
  credit:
  creditlink:
---

Continuous Integration,continuous delivery and continuous deploy are terms used a lot into software world. But I think, in most cases, are used in the wrong way, by me in the first place.
I have read the guide to dev ops of DZone and I found a very simple and clear definitions of these things:

Continuous Integration is a software development practice in which you build and test software every time a developer pushes code to the application.

Continuous Delivery is a software engineering approach in which continuous integration, automated testing, and automated deployment capabilities allow software to be developed and deployed rapidly, reliably, and repeatedly with minimal human intervention. Still, the deployment to production is defined strategically and triggered manually.

Continuous Deployment is a software development practice in which every code change goes through the entire pipeline and is put into production automatically, resulting in many production deployments every day. It does everything that Continuous Delivery does, but the process is fully automated; there’s no human intervention at all.

So, at first sight, these are the definitions of the same thing, but it isn’t. Continuous integration stops at test stage, continuous delivery make a more step and stops at manually deployment to production. Continuous Deployment makes the last step and deploy automatically software to production.

I think is important to keep in mind these differences in order to make the right choose in your software production chain.
