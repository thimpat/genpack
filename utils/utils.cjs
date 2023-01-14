const {statSync} =require("fs");

/**
 * Format bytes as human-readable text.
 *
 * @see https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
const convertBytesToHumanReadable = function (bytes, si = false, dp = 1)
{
    try
    {
        const thresh = si ? 1000 : 1024;

        if (Math.abs(bytes) < thresh)
        {
            return bytes + ' B';
        }

        const units = si
            ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        const r = 10 ** dp;

        do
        {
            bytes /= thresh;
            ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


        return bytes.toFixed(dp) + units[u];
    }
    catch (e)
    {
        console.error({lid: 44545}, e.message);
    }

    return null;
};



function getHumanFileSize(filepath, si = false, dp = 1)
{
    const stat = statSync(filepath);
    return convertBytesToHumanReadable(stat.size, si, dp)
}

module.exports.convertBytesToHumanReadable = convertBytesToHumanReadable;
module.exports.getHumanFileSize = getHumanFileSize;
