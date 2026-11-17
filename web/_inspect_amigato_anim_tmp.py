import sys, pathlib, warnings
sys.path.insert(0, r'C:\Users\bruno\Downloads\TOS\_tools\UnityPy_1_23_0')
import UnityPy
UnityPy.config.FALLBACK_UNITY_VERSION='2022.3.52f1'
warnings.filterwarnings('ignore')
root=pathlib.Path(r'C:\Users\bruno\Downloads\TOS\TOS_Data\StreamingAssets\patches')
for i,p in enumerate(sorted(root.glob('*.anim.patch.j')),1):
    try:
        env=UnityPy.load(str(p))
        names=[]
        for obj in env.objects:
            if obj.type.name=='AnimationClip':
                names.append(str(obj.parse_as_object().m_Name))
        if names:
            print(p.name+'\t'+'|'.join(names))
    except Exception as e:
        print('ERROR\t'+p.name+'\t'+type(e).__name__)
    if i%500==0: print(f'PROGRESS\t{i}',flush=True)
