function FindProxyForURL(url,host)
{
if (
shExpMatch(host, "*pornhub.com")
|| shExpMatch(host, "*youporn.com")
|| shExpMatch(host, "*redtube.com")
|| shExpMatch(host, "*xvideos.com")
)
return "PROXY 103.86.156.150:43122";
else
return "DIRECT";
}