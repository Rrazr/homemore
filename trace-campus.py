import math,io,json,urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw
lat,lon,z=33.90353,-118.01655,19
n=2**z
x0=int((lon+180)/360*n)-2
y0=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n)-2
out=Image.new('RGB',(1280,1280))
def tile(p):
 x,y=p
 req=urllib.request.Request(f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y0+y}/{x0+x}',headers={'User-Agent':'Homemore site study'})
 with urllib.request.urlopen(req,timeout=25) as r: im=Image.open(io.BytesIO(r.read())).convert('RGB')
 return x,y,im
with ThreadPoolExecutor(max_workers=8) as ex:
 for x,y,im in ex.map(tile,[(x,y) for x in range(5) for y in range(5)]):out.paste(im,(256*x,256*y))
d=ImageDraw.Draw(out)
for k in range(0,1280,100):
 d.line((k,0,k,1280),fill='#ffffff',width=1);d.line((0,k,1280,k),fill='#ffffff',width=1)
 d.text((k+3,3),str(k),fill='red',stroke_width=1,stroke_fill='white');d.text((3,k+3),str(k),fill='red',stroke_width=1,stroke_fill='white')
out.save('campus-trace-reference.png')
Path('campus-trace-reference.json').write_text(json.dumps({'tileX':x0,'tileY':y0,'zoom':z}))
print(x0,y0)
