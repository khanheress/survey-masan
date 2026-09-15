import {parseProjectRules} from '@/lib/projectRules.mjs';
export default function ProjectProgress({project}){
 const counts=project.quota_counts||{total:project.response_count||0,gender:{},age:{},bumo:{}};
 const rules=project.rules||parseProjectRules(project.rules_json);
 const rows=[['Tổng phản hồi',counts.total,project.max_responses||null]];
 if(rules.gender.enabled)for(const g of ['Nam','Nữ'])rows.push([g,counts.gender[g]||0,rules.gender.quotas[g]]);
 if(rules.age.enabled)for(const b of rules.age.bands)rows.push([`${b.min}–${b.max} tuổi`,counts.age[`${b.min}-${b.max}`]||0,b.quota]);
 if(rules.bumo.enabled)for(const p of rules.bumo.products)rows.push([`BUMO: ${p.name}`,counts.bumo[p.name]||0,p.quota]);
 return <div>{rows.map(([label,current,target])=><div key={label} style={{margin:'.8rem 0'}}><div className="flex-between" style={{fontSize:'.875rem',gap:'1rem'}}><span>{label}</span><strong>{current}{target!==null?` / ${target}`:' · Không giới hạn'}</strong></div>{target!==null&&<progress aria-label={`Tiến độ ${label}`} value={target===0?1:Math.min(current,target)} max={target===0?1:target} style={{width:'100%',height:8,accentColor:'var(--accent-primary)'}}/>}</div>)}</div>;
}
