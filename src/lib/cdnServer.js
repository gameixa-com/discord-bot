const express = require('express');
const app = express();
app.use(express.urlencoded({ 
    extended: true
}));

var configLoader = require('node-env-config-file-loader');
var config = configLoader.load('./config.yml');



app.get('/:url(*)', async (req, res) => {
    const encodedUrl = req.params.url;
    const decodedUrl = decodeURIComponent(encodedUrl);
    if (decodedUrl == "" || decodedUrl == "favicon.ico") 
        return res.redirect('https://github.com/gameixa-com/discord-bot');

    try {
        const fullLink = await fetchLatestLink(decodedUrl);
        res.redirect(fullLink);
    } catch (ex) {
        if (ex.message)
            console.error(ex.message);
        else 
            console.log(ex)
        res.status(502).send("Something went wrong. Please ask the Server Owner to check the Console to see the issue.")
    }
});



async function fetchLatestLink(oldLink) {
    if (!oldLink.includes("https://")) {
        oldLink = `https://cdn.discordapp.com/${oldLink}`;
    }

    const linkData = await ParseLink(oldLink);
    if (linkData.error != 'none') {
        throw new Error(linkData.error);
    }

    try {
        const response = await fetch("https://discord.com/api/v9/attachments/refresh-urls", {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${config.bot.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attachment_urls: [oldLink]
            })
        });

        const data = await response.json();

        if (!data || !data.refreshed_urls || data.refreshed_urls.length === 0) {
            console.log("response:", data);
            throw new Error("Unexpected Discord response.");
        }

        let updatedLink = data.refreshed_urls[0].refreshed;
        return updatedLink;

    } catch (ex) {
        console.log(ex);
    }

    return "";
}



async function ParseLink(input) {
    if (input.includes("?"))
        input = input.split("?")[0];

    if (input.includes("attachments/"))
        input = input.split("attachments/")[1];

    let slashParts = input.split("/");
    if (slashParts.length != 3)
        return { error: 'Invalid link format.' };

    const [ channelID, fileID, fileName ] = slashParts;

    if (isNaN(Number(channelID)))
        return { error: 'Invalid channel ID.' };

    if (isNaN(Number(fileID)))
        return { error: 'Invalid file ID.' };

    if (!fileName.includes("."))
        return { error: 'Invalid file name.' };

    return {
        error: 'none',
        data: {
            channelID: Number(channelID),
            fileID: Number(channelID),
            fileName
        }
    }
}



app.listen(config.cdnServer.port, () => config.general.lang === 'tr' ? console.log(`${config.cdnServer.port} portu ile cdn sunucusu aktif edildi!`) : console.log(`The cdn server has been activated with port ${config.cdnServer.port}!`));