---
title: '#01 A wireless plotter'
description: |
    No cables, no worries.
    Now I can start my plotter from my couch. 
pubDate: 'March 15 2026'
heroImage: ../../assets/pictures/blog-placeholder.png
tools: 
    - plotter
    - pi zero 2W
---
The goal was simple: I want to sit on my couch with my laptop and send drawings to my plotter across the room. No hussle with USB cables.

I started by using [this article from Monokai](https://monokai.com/articles/how-to-wirelessly-plot-with-the-axidraw/) as my first guidance. It’s a great starting point for understanding how to get an AxiDraw running wirelessly, but as I quickly found out, the specific hardware and software versions can make the "last mile" a bit of a puzzle.

## Node versions
I'm using a pi zero 2W. Installing the right node version was a bit of a challenge. I couldn't get it to work with the latest version, so I had to downgrade to an older version. I switched to the stable node 20 version.
Maybe the new version also works, but I didn't had the patience to find out.

To install nvm on a pi zero 2W use the following commands:

`````bash
nvm install 20
nvm use 20
`````

## Install axidraw
Once Node was finally working, I installed Saxi with following command: `npm i -g saxi`. I typed `saxi` into the terminal afterwards and the server started... but my browser just showed a blank page with the words "Cannot GET /" by browsing to `http://[IP_ADDRESS]`.

This was the most confusing part. Saxi was running, but it couldn't find its own website files. I tried running it with `node index.mjs`, but then I hit a SyntaxError:
The requested module './dist/server/server.js' does not provide an export named 'default'

The server needs to be run from its actual installation folder using a specific entry point. The command that was working for me was:

`````bash
cd ~/.nvm/versions/node/v20.20.1/lib/node_modules/saxi
node cli.mjs
`````

Suddenly, the saxi UI appeared by browsing to `http://[IP_ADDRESS]`.

## Full automation
I didn't want to SSH into my Pi and type long commands every time I wanted to draw. I wanted to plug the Pi into the wall and have it "just work".

I used a systemd service to make this happen. This script runs in the background the second the Pi gets power.

The Final saxi.service file:

````` ini
[Unit]
Description=Saxi Plotter Server
After=network.target

[Service]
User=janaelst
WorkingDirectory=/home/janaelst/.nvm/versions/node/v20.20.1/lib/node_modules/saxi
# Tell the Pi where the Node engine is hidden
Environment="PATH=/home/janaelst/.nvm/versions/node/v20.20.1/bin:/usr/local/bin:/usr/bin:/bin"
# Run the specific cli.mjs file
ExecStart=/home/janaelst/.nvm/versions/node/v20.20.1/bin/node cli.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`````

Run the following commands to enable the service:

`````bash
sudo systemctl daemon-reload
sudo systemctl enable saxi
sudo systemctl start saxi
`````

And check the status with:
`````bash
sudo systemctl status saxi.service
`````

## Troubleshooting
If you get an ERR_SSL_PROTOCOL_ERROR, it’s because your browser is trying to be fancy and use https. The Pi is simple, it only speaks http.

<br>

- **Wrong:** https://[IP_ADDRESS]:9080
- **Right:** http://[IP_ADDRESS]:9080

<br>

Now, any device on my network can just go to that URL and start plotting. No cables, no terminal, no stress. (Well, less stress).






