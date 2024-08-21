const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, Events } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const TOKEN = "YOUR_BOT_TOKEN_HERE";
const API_KEY = "YOUR_API_KEY_HERE";
const UPLOAD_API_URL = "REQUEST_URL_HERE";
const IMAGE_BASE_URL = "IMAGE_BASE_URL_HERE";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);
  
    const commands = [
      new SlashCommandBuilder()
        .setName('upload')
        .setDescription('Upload an image you want to generate the URL')
        .addAttachmentOption(option => 
          option.setName('image')
            .setDescription('The image to upload')
            .setRequired(true)
        )
    ];
  
    const rest = new REST({ version: '10' }).setToken(TOKEN);
  
    try {
      console.log('Started refreshing application commands.');
  
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands },
      );
  
      console.log('Successfully reloaded application commands.');
    } catch (error) {
      console.error(error);
    }
  });
  
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;
  
    const { commandName } = interaction;
  
    if (commandName === 'upload') {
      const attachment = interaction.options.getAttachment('image');
      const fileExtension = path.extname(attachment.name).toLowerCase();
      const supportedFormats = ['.png', '.jpg', '.jpeg'];
  
      if (!supportedFormats.includes(fileExtension)) {
        const invalidFile = new EmbedBuilder()
        .setTitle('Invalid Format Detected!')
        .setColor('#2B2D31')
        .setDescription('Apologies, but I can only upload images in PNG and JPG/JPEG formats.')
        return interaction.reply({embeds: [invalidFile]});
      } await interaction.deferReply();
  
      try {
        const response = await axios.get(attachment.url, { responseType: 'stream' });
        const tempPath = path.join(__dirname, attachment.name);
        const writer = fs.createWriteStream(tempPath);
        response.data.pipe(writer);
  
        writer.on('finish', async () => {
          const formData = new FormData();
          formData.append('source', fs.createReadStream(tempPath));
          formData.append('type', 'file');
          formData.append('key', API_KEY);
  
          try {
            const uploadResponse = await axios.post(UPLOAD_API_URL, formData, {
              headers: formData.getHeaders(),
            });
  
            if (uploadResponse.data && uploadResponse.data.image && uploadResponse.data.image.url) {
              const fileUrl = `${IMAGE_BASE_URL}${path.basename(uploadResponse.data.image.url)}`;
              const success = new EmbedBuilder()
                .setTitle('Upload Success!')
                .setDescription(`Here is the image URL:\n${fileUrl}`)
                .setColor('#2B2D31')
                .setImage(fileUrl);
              await interaction.editReply({ embeds: [success] });
            } else {
              const fail = new EmbedBuilder()
                .setTitle('Upload Fail!')
                .setDescription('An unexpected error occurred during uploading your image. Kindly Wait a Moment. If the issue still persists, Please contact Developer!')
                .setColor('#2B2D31');
              await interaction.editReply({ embeds: [fail] });
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            const errorUpload = new EmbedBuilder()
              .setTitle('Upload Error!')
              .setDescription('There was an error during uploading your image. Please try again. If the issue still persists, Please contact Developer!')
              .setColor('#2B2D31');
            await interaction.editReply({ embeds: [errorUpload] });
          } fs.unlinkSync(tempPath);
        });
      } catch (error) {
        console.error('Error downloading image:', error);
        const errorProcess = new EmbedBuilder()
          .setTitle('Processing Error!')
          .setDescription('There was an error processing your image. Please try again. If the issue still persists, Please contact Developer!')
          .setColor('#2B2D31');
        await interaction.editReply({ embeds: [errorProcess] });
      }
    }
  });
  
  client.login(TOKEN);