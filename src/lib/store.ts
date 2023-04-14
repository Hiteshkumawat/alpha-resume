import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { derived, get, writable } from 'svelte/store';
import { get_blank_resume, get_blank_section_item, type Resume, type Section } from './utils';
export const resume_id = writable(0);
export const add_new_modal = writable(null);
export type Profile = {
	image: string;
	type: 'round' | 'rect';
};

export const get_all_profiles = (): Record<string, Profile> => {
	let image_data = {};
	if (browser) {
		const data = localStorage.getItem('all_profiles');
		if (!data) {
			localStorage.setItem('all_profiles', JSON.stringify({}));
		} else {
			image_data = JSON.parse(data);
		}
	}
	return image_data;
};
export const get_ls_resume = (id: number): Resume | undefined => {
	const resume_data = get_all_resume_arr();
	const resume = resume_data.find((item) => item.id === id);
	return resume;
};
export const get_all_resume_arr = (): Resume[] => {
	let resume_data = [];
	if (browser) {
		const data = localStorage.getItem('all_resume');
		if (!data) {
			localStorage.setItem('all_resume', JSON.stringify([]));
		} else {
			resume_data = JSON.parse(data);
		}
	}
	return resume_data;
};
function create_profile_store() {
	const profiles = get_all_profiles();
	const { subscribe, update, set } = writable(profiles);
	const addImage = (profile: Profile) => {
		update((store) => {
			store[get(resume_id)] = profile;
			return store;
		});
	};

	return {
		subscribe,
		addImage,
		set,
	};
}

function create_all_resume() {
	const resumes = get_all_resume_arr();
	const { subscribe, update, set } = writable(resumes);

	const add_section_item = (section_id) => {
		update((ar) => {
			const rid = get(resume_id);
			const resume = get_resume();
			const section = resume.sections.find((section) => section.id === section_id);
			const blank_item = get_blank_section_item(section.type);
			section.items.push(blank_item);
			ar[rid] = resume;
			return ar;
		});
	};

	const remove_section_item = (section_id, item_id) => {
		update((ar) => {
			const rid = get(resume_id);
			const resume = get_resume();
			const section = resume.sections.find((section) => section.id === section_id) as Section<any>;
			section.items = section.items.filter((item) => item.id !== item_id);
			ar[rid] = resume;
			return ar;
		});
	};

	// debounce it
	const update_section_item = (section_index, item_id, item) => {
		update((ar) => {
			const rid = get(resume_id);
			const resume = get_resume();
			const section = resume.sections[section_index];
			const item_index = section.items.findIndex((item) => item.id === item_id);
			section.items[item_index] = item;
			ar[rid] = resume;
			return ar;
		});
	};
	const move_section_item = (section_id, item_id, type) => {
		update((ar) => {
			const rid = get(resume_id);
			const resume = get_resume();
			const section = resume.sections.find((section) => section.id === section_id) as Section<any>;
			const item_index = section.items.findIndex((item) => item.id === item_id);
			var item = section.items[item_index];
			if (type == 'up') {
				var item2 = section.items[item_index - 1];
				if (item2 != undefined) {
					section.items[item_index - 1] = item;
					section.items[item_index] = item2;
				}
			} else {
				var item2 = section.items[item_index + 1];
				if (item2 != undefined) {
					section.items[item_index + 1] = item;
					section.items[item_index] = item2;
				}
			}
			ar[rid] = resume;
			return ar;
		});
	};

	const update_font = (font: string) => {
		update((ar) => {
			const rid = get(resume_id);
			const resume = get_resume();
			resume.settings.font = font;
			ar[rid] = resume;
			return ar;
		});
	};
	const get_item_index = (section_id, item_id) => {
		const resume = get_resume();
		const section = resume.sections.find((section) => section.id === section_id) as Section<any>;
		const item_index = section.items.findIndex((item) => item.id === item_id);
		return item_index;
	};
	const delete_resume = (resume_id) => {
		update((ar) => {
			const updated_resume_list = ar.filter((resume) => resume.id !== resume_id);
			return updated_resume_list;
		});
	};
	const add_resume = (resume_name) => {
		const blank_resume = get_blank_resume(resume_name);
		update((ar) => {
			ar.push(blank_resume);
			return ar;
		});
		// resume_id.set(blank_resume.id);
		const path = `/resume?id=${blank_resume.id}`;
		goto(path);
	};

	const edit_resume = (id) => {
		const path = `/resume?id=${id}`;
		goto(path);
	};

	return {
		subscribe,
		update,
		set,
		add_section_item,
		remove_section_item,
		update_section_item,
		move_section_item,
		add_resume,
		delete_resume,
		edit_resume,
		update_font,
		get_item_index,
	};
}

export const store = create_all_resume();
export const profile_store = create_profile_store();
export const imageCropWindowDisplay = writable(false);

store.subscribe((data) => {
	if (browser) {
		localStorage.setItem('all_resume', JSON.stringify(data));
	}
});

profile_store.subscribe((data) => {
	if (browser) {
		localStorage.setItem('all_profiles', JSON.stringify(data));
	}
});

export const font = derived([store, resume_id], ([$store, $resume_id]) => {
	const resume = $store.find((resume) => resume.id === $resume_id);
	return resume?.settings.font;
});
export const preview_data = derived(
	[store, resume_id, profile_store],
	([$store, $resume_id, $profile_store]) => {
		if ($resume_id) {
			const resume = $store.find((resume) => resume.id === $resume_id);

			const profile = $profile_store[$resume_id];
			let preview_data = {};
			resume.sections.forEach((section) => {
				preview_data[section.name] = { type: section.type };

				preview_data[section.name]['data'] = section.items.map((item) => {
					const field_data = {};
					Object.keys(item.fields).forEach((key) => {
						field_data[item.fields[key].label] = item.fields[key].value;
					});
					return field_data;
				});
			});

			return preview_data;
		}
	},
);

export const no_of_sections = (): number => {
	return get_resume().sections.length;
};

export const no_of_resumes = (): number => {
	return get(store).length;
};
export const get_resume_index = () => {
	return get(store).findIndex((resume) => resume.id === get(resume_id));
};
export function download() {
	const element = document.getElementById('preview');
	element.style.fontFamily = get(font) || 'Inter';
	html2pdf(element, { html2canvas: { scale: 2 } });
}

export const get_resume = () => {
	const rid = get(resume_id);
	return get(store).find((resume) => resume.id === rid) as Resume;
};

export const get_profile = () => {
	const rid = get(resume_id);
	return get(profile_store)[rid];
};
