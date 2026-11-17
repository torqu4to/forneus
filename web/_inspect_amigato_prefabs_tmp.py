import sys, pathlib, warnings
sys.path.insert(0, r'C:\Users\bruno\Downloads\TOS\_tools\UnityPy_1_23_0')
import UnityPy
UnityPy.config.FALLBACK_UNITY_VERSION='2022.3.52f1'
warnings.filterwarnings('ignore')
root=pathlib.Path(r'C:\Users\bruno\Downloads\TOS\TOS_Data\StreamingAssets\patches')
for i,p in enumerate(sorted(root.glob('*.prefab.patch.j')),1):
    try:
        env=UnityPy.load(str(p)); hits=[]
        for obj in env.objects:
            if obj.type.name in ('GameObject','MonoBehaviour','Animator','Animation','SkinnedMeshRenderer','MeshFilter','MeshRenderer'):
                try:
                    data=obj.parse_as_object(); name=str(getattr(data,'m_Name','') or '')
                    if any(q in name.lower() for q in ('dutengmao','flora','amigato','catpal','jiuxianmao','maoniang','pet_cat','cat_')): hits.append(obj.type.name+':'+name)
                except Exception: pass
        if hits: print(p.name+'\t'+'|'.join(hits))
    except Exception as e: print('ERROR\t'+p.name+'\t'+type(e).__name__)
    if i%500==0: print(f'PROGRESS\t{i}',flush=True)
