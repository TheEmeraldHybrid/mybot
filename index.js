const Discord = require('discord.js');

const ffmpeg = require('ffmpeg-binaries')

const ytdl = require('ytdl-core');

const TOKEN = "NDI0MzU0NzI4MDI2MDQ2NDY1.DY34UA.w2_EqoZa1tcLSPb7BpPGoE0PxJo";

const PREFIX = "+"

var bot = new Discord.Client();

const queue = new Map();

bot.on("ready", function(){
    console.log("Ready");
});

//hey command

bot.on("message", function(message){
    if (message.author.equals(bot.user)) return;

    if (message.content == "hello") {
        message.channel.sendMessage("Hi, there!");
    }
    
    if (message.content == "hey") {
        message.channel.sendMessage("Hi, there!");
    }

    if (message.content == "hi") {
        message.channel.sendMessage("Hi, there!");
    }

    if (message.content == "bye") {
        message.channel.sendMessage("Bye! It was nice having you around");
    }
});

//other commands

bot.on("message", function(message){
    if (message.author.equals(bot.user)) return;

    if (!message.content.startsWith(PREFIX)) return;

    var args = message.content.substring(PREFIX.length).split(" ");

    switch(args[0].toLowerCase()) {
        case "ping":
            message.channel.sendMessage("Pong!");
            break;
        case "help":
            var embed = new Discord.RichEmbed()
                .setTitle("Command List:")
                .addField("Prefix:", "+")
                .addField("+help", "Will give you current command list.")
                .addField("+ping", "Will show the ping time for the bot")
                .addField("+avatar", "Will send the user's avatar url")
                .addField("+play", "Use this command to play a song (eg: +play (link)).")
                .addField("+skip", "Skips the song")
                .addField("+stop", "Stops the song.")
                .addField("hello, hey, hi", "Bot will reply to you if you say any of the above! (hello,hey and hi are case sensitive)")
                .setColor("80FF00")
            message.channel.sendEmbed(embed);
            break;
        case "avatar":
            message.reply(message.author.avatarURL);
            break;
    }   
})

//kick command
bot.on('message', message => {
    if (!message.guild) return;
  
    if (message.content.startsWith('+kick')) {
      const user = message.mentions.users.first();
      if (user) {
        const member = message.guild.member(user);
        if (member) {
          member.kick('Optional reason that will display in the audit logs').then(() => {
            message.reply(`Successfully kicked ${user.tag}`);
          }).catch(err => {
            message.reply('I was unable to kick the member');
            console.error(err);
          });
        } else {
          message.reply('That user isn\'t in this guild!');
        }
      } else {
        message.reply('You didn\'t mention the user to kick!');
      }
    }
  });

//music
bot.on('message', async msg => {
    if (msg.author.bot) return undefined;
    if (!msg.content.startsWith(PREFIX)) return undefined;
    const args = msg.content.split(' ');
    const serverQueue = queue.get(msg.guild.id);

    if (msg.content.startsWith(`${PREFIX}play`)) {
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send('I am sorry but you need to be in a voice channel to play music!');
        const permissions = voiceChannel.permissionsFor(msg.client.user);
        if (!permissions.has('CONNECT')) {
            return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
        }
        if (!permissions.has('SPEAK')) {
            return msg.channel.send('I cannot play music in this channel, make sure I have the proper permissions!');
        }

        const songInfo = await ytdl.getInfo(args[1]);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url
        };
        if (!serverQueue) {
            const queueConstruct = {
                textChannel: msg.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };
            queue.set(msg.guild.id, queueConstruct);

            queueConstruct.songs.push(song);

            try {
                var connection = await voiceChannel.join();
                queueConstruct.connection = connection;
                play(msg.guild, queueConstruct.songs[0]);
            } catch (error) {
                console.error(`I could not join the voice channel: ${error}`);
                queue.delete(msg.guild.id);
                return msg.channel.send(`I could not join the voice channel: ${error}`);
            }
        } else {
            serverQueue.songs.push(song);
            console.log(serverQueue.songs);
            return msg.channel.send(`**${song.title}** has been added to the queue!`);
        }
        return undefined;
    } else if (msg.content.startsWith(`${PREFIX}skip`)) {
        if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
        if (!serverQueue) return msg.channel.send('There is nothing playing that I could skip for you.');
        serverQueue.connection.dispatcher.end();
        return undefined;
    } else if (msg.content.startsWith(`${PREFIX}stop`)) {
        if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
        if (!serverQueue) return msg.channel.send('There is nothing playing that I could stop for you.');
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
        return undefined;
    } else if(msg.content.startsWith(`${PREFIX}volume`)) {
        if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
        if (!serverQueue) return msg.channel.send('There is nothing playing.');
        if (!args[1]) return msg.channel.send(`The current volume is: **${serverQueue.volume}**`);
        serverQueue.volume = args[1];
        serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
        return msg.channel.send(`I set the volume to **${args[1]}**`);
    } else if (msg.content.startsWith(`${PREFIX}np`)) {
        if (!serverQueue) return msg.channel.send('There is nothing playing.');
        return msg.channel.send(`Now playing: **${serverQueue.songs[0].title}**`);
    } else if (msg.content.startsWith(`${PREFIX}queue`)) {
        if (!serverQueue) return msg.channel.send('There is nothing playing.');
        return msg.channel.send(`
__**Song queue:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}

**Now playing:** ${serverQueue.songs[0].title}
        `);
    } else if (msg.content.startsWith(`${PREFIX}pause`)) {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return msg.channel.send('Paused the music for you!');
        } 
        return msg.channel.send('There is nothing playing.');
    } else if (msg.content.startsWith(`${PREFIX}resume`)) {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return msg.channel.send('Resumed the music for you!');
        }
        return msg.channel.send('There is nothing playing.');
    }

    return undefined;
});

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    console.log(serverQueue.songs);

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
            .on('end', () => {
                console.log('song ended!');
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            })
            .on('error', error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

bot.login(TOKEN);